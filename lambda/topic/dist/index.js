"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const kafkajs_1 = require("kafkajs");
const client_kafka_1 = require("@aws-sdk/client-kafka");
const handler = async (event) => {
    // Replace with your MSK cluster ARN
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
        const message = 'Topic ${topicName} created successfully.';
        console.log(message);
        return {
            status: message
        };
    }
    catch (error) {
        console.error('Error creating topic ${topicName}:', error);
        throw error;
    }
};
exports.handler = handler;
