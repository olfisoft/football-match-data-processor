import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NetworkConfig } from './network-stack';
import { MskConfig } from './msk-stack';
import { StorageConfig } from './storage-stack';

interface AppStackProps extends cdk.StackProps {
  networkConfig: NetworkConfig;
  mskConfig: MskConfig;
  storageConfig: StorageConfig;

  processingBatchSize: number;
  processingBatchWindow: number;
  maxProcessingTime: number;
}

export class FootballMatchDataProcessorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const vpc = props.networkConfig.vpc;
    const securityGroup = props.networkConfig.securityGroup;
    const mskCluster = props.mskConfig.cluster;
    const mskEventTopicName = props.mskConfig.eventTopicName;
    const matchEventTable = props.storageConfig.matchEventTable;
    const matchEventBucket = props.storageConfig.matchEventBucket;

    // Enrich Lambda function to enrich Match events
    // Executed as part of the Step function workflow for demonstration purposes
    const enrichLambda = new lambda.Function(this, "EnrichLambda", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "app.handler",
      code: lambda.Code.fromAsset(
        "./lambda/process/enrich"
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(
        props.maxProcessingTime
      ) // Batch operation can take longer processing time
    });

    // Store Lambda function to store raw and enriched Match events
    // Executed as part of the Step function workflow for demonstration purposes
    const storeLambda = new lambda.Function(this, "StoreLambda", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "app.handler",
      code: lambda.Code.fromAsset(
        "./lambda/process/store"
      ),
      environment: {
        S3_BUCKET_NAME: matchEventBucket.bucketName,
        DYNAMODB_TABLE_NAME: matchEventTable.tableName
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(
        props.maxProcessingTime
      ) // Batch operation can take longer processing time
    });
    
    // Grant Store Lambda write access privileges
    matchEventTable.grantWriteData(storeLambda);
    matchEventBucket.grantWrite(storeLambda);

    // Step Function tasks
    const enrichTask = new tasks.LambdaInvoke(this, 'EnrichTask', {
      lambdaFunction: enrichLambda,
      outputPath: '$.Payload',
    });

    const storeTask = new tasks.LambdaInvoke(this, 'StoreTask', {
      lambdaFunction: storeLambda,
      outputPath: '$.Payload',
    });

    // Step Function state machine
    const workflowDefinition = enrichTask
      .next(storeTask);

    const stateMachine = new cdk.aws_stepfunctions.StateMachine(this, 'StateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(workflowDefinition),
      stateMachineName: 'FootballMatchDataProcessorStateMachine',
    });

    // Consume Lambda function to prepare Match events for Batch processing
    // Uses Step Function State Machine to run the workflow of Batch processing
    const consumeLambda = new lambda.Function(this, "ConsumeLambda", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "app.handler",
      code: lambda.Code.fromAsset(
        "./lambda/process/consume"
      ),
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn
      },
      vpc: vpc, // Deploy the Lambda function in the same VPC as the MSK cluster
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Use private subnets
      },
      securityGroups: [securityGroup], // Use the same security group as the MSK cluster
      memorySize: 512,
      timeout: cdk.Duration.seconds(
        props.maxProcessingTime
      ) // Batch operation can take longer processing time
    });

    // Grant Process Lambda function access to MSK cluster
    consumeLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'kafka:DescribeCluster',
          'kafka:GetBootstrapBrokers',
          'kafka:ListTopics'],
        resources: [mskCluster.attrArn],
      })
    );

    // Grant Consume Lambda function permission to start the state machine
    stateMachine.grantStartExecution(consumeLambda);
    
    // Configure MSK trigger for Consume Lambda function
    consumeLambda.addEventSource(
      new lambdaEventSources.ManagedKafkaEventSource({
        clusterArn: mskCluster.attrArn,
        topic: mskEventTopicName,
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: props.processingBatchSize,
        maxBatchingWindow: cdk.Duration.seconds(props.processingBatchWindow)
      })
    );
  }
}
