import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as msk from 'aws-cdk-lib/aws-msk';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NetworkConfig } from './network-stack';

// Config abstraction to reduce dependencies between Stack classes
export interface MskConfig {
  cluster: msk.CfnCluster;
  eventTopicName: string;
}

// Topic configuration abstraction
export interface TopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
}

// Accepted properties
interface MskStackProps extends cdk.StackProps {
  kafkaVersion: string;
  numberOfBrokerNodes: number;
  instanceType: string;
  networkConfig: NetworkConfig;
  eventTopicConfig: TopicConfig;
}

export class MskStack extends cdk.Stack {
  public readonly config: MskConfig;

  constructor(scope: Construct, id: string, props: MskStackProps) {
    super(scope, id, props);

    const vpc = props.networkConfig.vpc;
    const securityGroup = props.networkConfig.securityGroup;
    const eventTopicConfig = props.eventTopicConfig;

    // MSK cluster to process Match events
    const mskCluster = new msk.CfnCluster(this, "MskCluster", {
      clusterName: "FootballMatchDataProcessorMskCluster",
      kafkaVersion: props.kafkaVersion,
      numberOfBrokerNodes: props.numberOfBrokerNodes,
      brokerNodeGroupInfo: {
        clientSubnets: vpc.publicSubnets.map(subnet => subnet.subnetId),
        instanceType: props.instanceType,
        securityGroups: [securityGroup.securityGroupId]
      },
      encryptionInfo: {
        encryptionInTransit: {
          // Disable TLS for demonstration purposes
          clientBroker: 'PLAINTEXT',
          inCluster: true,
        },
      },
    });

    // Topic Lambda Function to create MSK topic
    const topicLambda = new lambda.Function(this, 'TopicLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/topic/dist'),
      // Deploy the function in the same VPC of MSK cluster
      vpc: vpc,
      // Use the same security group as the MSK cluster
      securityGroups: [securityGroup],
      environment: {
        MSK_CLUSTER_ARN: mskCluster.attrArn,
        MSK_TOPIC_NAME: eventTopicConfig.name,
        MSK_TOPIC_PARTITIONS: eventTopicConfig.partitions.toString(),
        MSK_TOPIC_REPLICATION_FACTOR: eventTopicConfig.replicationFactor.toString(),
      },
      memorySize: 256, // Actual memory consumption is about 100 MB
      timeout: cdk.Duration.seconds(30)
    });

    // Grant Topic Lambda function write access to MSK cluster
    topicLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'kafka:GetBootstrapBrokers',
          'kafka:CreateTopic',
        ],
        resources: [mskCluster.attrArn],
      })
    );

    // Create Custom Resource to invoke Topic Lambda 
    const customResource = new cr.AwsCustomResource(this, 'CreateKafkaTopic', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: topicLambda.functionName,
          InvocationType: 'RequestResponse',
        },
        physicalResourceId: cr.PhysicalResourceId.of('CreateKafkaTopic'),
      },
      onDelete: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: topicLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify({ action: 'delete' }),
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'], // Allow invoking the Lambda function
          resources: [topicLambda.functionArn], // Restrict to Topic Lambda function
        }),
      ]),
    });

    // Run Custom Resource after the MSK cluster is created
    customResource.node.addDependency(mskCluster);

    this.config = {
      cluster: mskCluster,
      eventTopicName: eventTopicConfig.name
    };
  }
}
