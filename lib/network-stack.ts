import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// Config abstraction to reduce dependencies between Stack classes
export interface NetworkConfig {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
}

export class NetworkStack extends cdk.Stack {
  public readonly config: NetworkConfig;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for the MSK cluster 
    const vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: "FootballMatchDataProcessorVpc",
      maxAzs: 2
    });

    // Create AWS service endpoints for deployed Lambda functions
    vpc.addInterfaceEndpoint('LambdaEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
    });

    vpc.addInterfaceEndpoint('StsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.STS,
    });

    // Security group for the MSK cluster
    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vpc,
      securityGroupName: "FootballMatchDataProcessorSecurityGroup",
      description: "Security group for Football Match Data Processor",
      allowAllOutbound: true
    });

    // Allow inbound traffic on the specified port
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(9092),
      "Allow inbound traffic on port 9092"
    );

    this.config = {
      vpc,
      securityGroup
    };
  }
}
