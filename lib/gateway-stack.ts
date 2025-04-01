import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NetworkConfig } from './network-stack';
import { MskConfig } from './msk-stack';
import { StorageConfig } from './storage-stack';

// Accepted properties
interface GatewayStackProps extends cdk.StackProps {
  networkConfig: NetworkConfig;
  mskConfig: MskConfig;
  storageConfig: StorageConfig;
}

export class GatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GatewayStackProps) {
    super(scope, id, props);

    const vpc = props.networkConfig.vpc;
    const securityGroup = props.networkConfig.securityGroup;
    const mskCluster = props.mskConfig.cluster;
    const mskEventTopicName = props.mskConfig.eventTopicName;
    const matchEventTable = props.storageConfig.matchEventTable;

    // Ingest Lambda function to ingest Match events
    const ingestLambda = new lambda.Function(this, "IngestLambda", {
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: "app.handler",
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset(
        "./lambda/ingest"
      ),
      // Deploy the function in the same VPC of MSK cluster
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }),
      // Use the same security group as the MSK cluster
      securityGroups: [securityGroup],
      environment: {
        MSK_CLUSTER_ARN: mskCluster.attrArn,
        MSK_TOPIC_NAME: mskEventTopicName
      },
      memorySize: 256, // Actual memory consumption is about 100 MB
      timeout: cdk.Duration.seconds(30)
    });

    // Grant Ingest Lambda function write access to MSK cluster
    ingestLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'kafka:GetBootstrapBrokers',
          'kafka:WriteData',
        ],
        resources: [mskCluster.attrArn],
      })
    );

    // Query Lambda function to query Match events
    const queryLambda = new lambda.Function(this, "QueryLambda", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "app.handler",
      code: lambda.Code.fromAsset(
        "./lambda/query"
      ),
      environment: {
        DYNAMODB_TABLE_NAME: matchEventTable.tableName
      }
    });

    // Grant Query Lambda read access privileges
    matchEventTable.grantReadData(queryLambda);
    
    // API Gateway endpoint to ingest Match events
    const apiName = "FootballMatchDataProcessorApi";
    const ingestEventApi = new apigateway.RestApi(this, apiName, {
      restApiName: apiName
    });

    // Lambda integrations
    const ingestLambdaIntegration = new apigateway.LambdaIntegration(ingestLambda);
    const queryLambdaIntegration = new apigateway.LambdaIntegration(queryLambda);

    // Create root resource for matches
    const matchesResource = ingestEventApi.root.addResource('matches');

    // Create resource for the endpoint: POST matches/event
    const ingestResource = matchesResource.addResource('event');
    ingestResource.addMethod("POST", ingestLambdaIntegration);

    // Create resource for the endpoint: GET matches/{match_id}/goals
    const matchResource = matchesResource.addResource('{match_id}');
    const goalsResource = matchResource.addResource('goals');
    goalsResource.addMethod("GET", queryLambdaIntegration);

    // Create resource for the endpoint: GET matches/{match_id}/passes
    const passesResource = matchResource.addResource('passes');
    passesResource.addMethod("GET", queryLambdaIntegration);
  }
}
