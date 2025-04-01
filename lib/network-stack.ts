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
      maxAzs: 2,
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: 'PublicSubnet',
          cidrMask: 24
        },
        {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          name: 'PrivateSubnet',
          cidrMask: 24
        }
      ]
    });

    // Security group for the MSK cluster
    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: vpc,
      description: "Security group for MSK cluster",
      allowAllOutbound: true
    });

    // Allow inbound traffic on the specified port
    securityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(9092),
      "Allow Kafka traffic within VPC on port 9092"
    );

    this.config = {
      vpc,
      securityGroup
    };
  }
}
