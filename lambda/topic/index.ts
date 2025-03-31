import { Kafka } from 'kafkajs';
import { KafkaClient, GetBootstrapBrokersCommand } from '@aws-sdk/client-kafka';

export const handler = async (event: any): Promise<any> => {

  const clusterArn: string = process.env.MSK_CLUSTER_ARN!;
  const topicName: string = process.env.MSK_TOPIC_NAME!;
  const topicPartitions: number = +process.env.MSK_TOPIC_PARTITIONS!;
  const topicReplicationFactor: number = +process.env.MSK_TOPIC_REPLICATION_FACTOR!;
  
  // Initialize the Kafka Admin client
  const kafkaClient = new KafkaClient({});
  const command = new GetBootstrapBrokersCommand({ ClusterArn: clusterArn });

  try {
    // Get the bootstrap brokers from the MSK cluster
    const response = await kafkaClient.send(command);
    const bootstrapBrokers = response.BootstrapBrokerString;

    if (!bootstrapBrokers) {
      throw new Error('Failed to retrieve bootstrap brokers from MSK cluster.');
    }

    console.log(`Received Bootstrap Brokers: ${bootstrapBrokers}`);

    const kafka = new Kafka({
      clientId: 'football-match-data-processor',
      brokers: bootstrapBrokers.split(','),
    });

    const admin = kafka.admin();
    await admin.connect();

    // Create the Kafka topic
    await admin.createTopics({
      topics: [
        {
          topic: topicName,
          numPartitions: topicPartitions,
          replicationFactor: topicReplicationFactor,
        },
      ],
    });

    await admin.disconnect();

    const message = 'Topic ${topicName} created successfully.'
    console.log(message);

    return {
      status: message
    };
  } catch (error) {
    console.error('Error creating topic ${topicName}:', error);
    throw error;
  }
};
