#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { StorageStack } from '../lib/storage-stack';
import { MskStack } from '../lib/msk-stack';
import { GatewayStack } from '../lib/gateway-stack';
import { FootballMatchDataProcessorStack } from '../lib/football-match-data-processor-stack';

// The stack is specialized for the AWS Account and Region.
// They are implied by the current CLI configuration.
// Set specific parameters if needed
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
}

const app = new cdk.App();

// Create Network Stack
const networkStack = new NetworkStack(app, 'FootballMatchDataProcessorNetworkStack', {
  env: env,
});

// Create MSK Stack and MSK topic
const mskStack = new MskStack(app, 'FootballMatchDataProcessorMskStack', {
  env: env,
  kafkaVersion: "3.6.0",
  numberOfBrokerNodes: 2,
  instanceType: "kafka.t3.small",
  networkConfig: networkStack.config,

  eventTopicConfig: {
    name: 'football-match-event-topic-001',
    partitions: 2, // Number of consumers to process in parallel
    replicationFactor: 1 // No replication for demonstration purposes
  }
});

// Create Storage Stack, configure Dynamo DB
const storageStack = new StorageStack(app, 'FootballMatchDataProcessorStorageStack', {
  env: env,
  eventBucketName: 'football-match-raw-data-bucket'
});

// Create Gateway Stack with relevant Lambda functions
const gatewayStack = new GatewayStack(app, 'FootballMatchDataProcessorGatewayStack', {
  env: env,
  networkConfig: networkStack.config,
  mskConfig: mskStack.config,
  storageConfig: storageStack.config
});

// Create Application Stack with processing Step Functions
new FootballMatchDataProcessorStack(app, 'FootballMatchDataProcessorStack', {
  env: env,
  networkConfig: networkStack.config,
  mskConfig: mskStack.config,
  storageConfig: storageStack.config,

  processingBatchSize: 10, // max number of Match events to process in a batch
  processingBatchWindow: 3, // Wait up to X seconds for a larger batch
  maxProcessingTime: 300 // 5 minutes, increase if Batch size is large
});
