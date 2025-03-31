import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// Accepted properties
interface StorageStackProps extends cdk.StackProps {
  eventBucketName: string;
}

// Config abstraction to reduce dependencies between Stack classes
export interface StorageConfig {
  matchEventBucket: s3.Bucket;
  matchEventTable: dynamodb.Table;
}

export class StorageStack extends cdk.Stack {
  public readonly config: StorageConfig;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);
    
    // S3 bucket to store raw Match events
    const matchEventBucket = new s3.Bucket(this, 'FootballMatchRawDataBucket', {
      bucketName: props.eventBucketName,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // DynamoDB table to store enriched Match events
    const matchEventTable = new dynamodb.Table(this, "MatchEventTable", {
      partitionKey: {
        // Generated internal UUID for Match events
        name: "event_id", type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    // DynamoDB Global Secondary Index to query Match events by match_id and event_type
    // API endpoints:
    // GET matches/{match_id}/goals
    // GET matches/{match_id}/passes
    matchEventTable.addGlobalSecondaryIndex({
      indexName: "MatchIdEventTypeIndex",
      partitionKey: {
        name: "match_id", type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: "event_type", type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.config = {
      matchEventBucket,
      matchEventTable
    };
  }
}
