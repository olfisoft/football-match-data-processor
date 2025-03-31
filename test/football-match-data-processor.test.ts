import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { Template } from 'aws-cdk-lib/assertions';
import { StorageStack } from '../lib/storage-stack';
import { MskStack } from '../lib/msk-stack';
import { GatewayStack } from '../lib/gateway-stack';
import { FootballMatchDataProcessorStack } from '../lib/football-match-data-processor-stack';

test('Network Stack is created with correct environment', () => {
  const app = new cdk.App();
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  };

  const networkStack = new NetworkStack(app, 'FootballMatchDataProcessorNetworkStack', { env });

  expect(networkStack).toBeDefined();

  const template = Template.fromStack(networkStack);
  template.hasResource('AWS::EC2::VPC', {});
});

test('Storage Stack is created with correct bucket name', () => {
  const app = new cdk.App();
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  };

  const storageStack = new StorageStack(app, 'FootballMatchDataProcessorStorageStack', {
    env,
    eventBucketName: 'football-match-raw-data-bucket',
  });

  expect(storageStack).toBeDefined();

  const template = Template.fromStack(storageStack);
  template.hasResource('AWS::S3::Bucket', {});
  template.hasResource('AWS::DynamoDB::Table', {});
});

test('MSK Stack is created with correct configuration', () => {
  const app = new cdk.App();
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  };

  const networkStack = new NetworkStack(app, 'NetworkStack', { env });

  const mskStack = new MskStack(app, 'FootballMatchDataProcessorMskStack', {
    env,
    kafkaVersion: '3.6.0',
    numberOfBrokerNodes: 2,
    instanceType: 'kafka.t3.small',
    networkConfig: networkStack.config,
    eventTopicConfig: {
      name: 'football-match-event-topic-001',
      partitions: 2,
      replicationFactor: 1,
    },
  });

  expect(mskStack).toBeDefined();

  const template = Template.fromStack(mskStack);
  template.hasResourceProperties('AWS::MSK::Cluster', {
    KafkaVersion: '3.6.0',
    NumberOfBrokerNodes: 2,
    BrokerNodeGroupInfo: {
      InstanceType: 'kafka.t3.small',
    },
  });
});

test('Gateway Stack is created with correct dependencies', () => {
  const app = new cdk.App();
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  };

  const networkStack = new NetworkStack(app, 'NetworkStack', { env });
  const storageStack = new StorageStack(app, 'StorageStack', {
    env,
    eventBucketName: 'test-bucket'
  });
  const mskStack = new MskStack(app, 'MskStack', {
    env,
    kafkaVersion: '3.6.0',
    numberOfBrokerNodes: 2,
    instanceType: 'kafka.t3.small',
    networkConfig: networkStack.config,
    eventTopicConfig: {
      name: 'test-topic',
      partitions: 2,
      replicationFactor: 1,
    },
  });

  const gatewayStack = new GatewayStack(app, 'FootballMatchDataProcessorGatewayStack', {
    env,
    networkConfig: networkStack.config,
    mskConfig: mskStack.config,
    storageConfig: storageStack.config,
  });

  expect(gatewayStack).toBeDefined();

  const template = Template.fromStack(gatewayStack);
  template.hasResourceProperties('AWS::ApiGateway::RestApi', {
    Name: 'FootballMatchDataProcessorApi'
  });
});

test('Application Stack is created with correct configurations', () => {
  const app = new cdk.App();
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  };

  const networkStack = new NetworkStack(app, 'NetworkStack', { env });
  const storageStack = new StorageStack(app, 'StorageStack', {
    env,
    eventBucketName: 'test-bucket'
  });
  const mskStack = new MskStack(app, 'MskStack', {
    env,
    kafkaVersion: '3.6.0',
    numberOfBrokerNodes: 2,
    instanceType: 'kafka.t3.small',
    networkConfig: networkStack.config,
    eventTopicConfig: {
      name: 'test-topic',
      partitions: 2,
      replicationFactor: 1,
    },
  });

  const appStack = new FootballMatchDataProcessorStack(app, 'FootballMatchDataProcessorStack', {
    env,
    networkConfig: networkStack.config,
    mskConfig: mskStack.config,
    storageConfig: storageStack.config,
    processingBatchSize: 10,
    processingBatchWindow: 3,
    maxProcessingTime: 300,
  });

  expect(appStack).toBeDefined();
});
