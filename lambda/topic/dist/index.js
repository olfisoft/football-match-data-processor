"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const kafkajs_1 = require("kafkajs");
const client_kafka_1 = require("@aws-sdk/client-kafka");
/**
 * AWS Lambda handler to create a Kafka topic in an MSK cluster.
 *
 * @param {any} event - The event object passed to the Lambda function.
 * @returns {Promise<any>} - A promise that resolves with the status of the topic creation.
 *
 * Environment Variables:
 * - MSK_CLUSTER_ARN: The ARN of the MSK cluster.
 * - MSK_TOPIC_NAME: The name of the Kafka topic to create.
 * - MSK_TOPIC_PARTITIONS: The number of partitions for the Kafka topic.
 * - MSK_TOPIC_REPLICATION_FACTOR: The replication factor for the Kafka topic.
 *
 * @throws {Error} - Throws an error if the topic creation fails or if bootstrap brokers cannot be retrieved.
 */
const handler = async (event) => {
    const clusterArn = process.env.MSK_CLUSTER_ARN;
    const topicName = process.env.MSK_TOPIC_NAME;
    const topicPartitions = +process.env.MSK_TOPIC_PARTITIONS;
    const topicReplicationFactor = +process.env.MSK_TOPIC_REPLICATION_FACTOR;
    // Initialize the Kafka Admin client
    const kafkaClient = new client_kafka_1.KafkaClient({});
    const command = new client_kafka_1.GetBootstrapBrokersCommand({ ClusterArn: clusterArn });
    try {
        // Get the bootstrap brokers from the MSK cluster
        const response = await kafkaClient.send(command);
        const bootstrapBrokers = response.BootstrapBrokerString;
        if (!bootstrapBrokers) {
            throw new Error('Failed to retrieve bootstrap brokers from MSK cluster.');
        }
        console.log(`Received Bootstrap Brokers: ${bootstrapBrokers}`);
        const kafka = new kafkajs_1.Kafka({
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
        const message = `Topic ${topicName} created successfully.`;
        console.log(message);
        return {
            status: message
        };
    }
    catch (error) {
        console.error(`Error creating topic ${topicName}:`, error);
        throw error;
    }
};
exports.handler = handler;
