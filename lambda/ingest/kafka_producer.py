import boto3
from typing import Any
from kafka import KafkaProducer

KAFKA_PRODUCER_TIMEOUT = 10

class KafkaProducerContext:
    """
    Kafka producer context manager
    Frees resources automatically
    """
    def __init__(self, msk_cluster_arn: str) -> None:
        self.msk_cluster_arn = msk_cluster_arn
        
        self._get_bootstrap_servers()
        self._init_producer()

    def __enter__(self):
        return self

    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any):
        self.producer.close()

    def _get_bootstrap_servers(self) -> None:
        client = boto3.client('kafka')
        response = client.get_bootstrap_brokers(
            ClusterArn=self.msk_cluster_arn
        )
        self.bootstrap_servers = response['BootstrapBrokerString'].split(',')
        extra = {
            "brokers": self.bootstrap_servers
        }
        print(f"Received Kafka config: {extra}")
    
    def _init_producer(self) -> None:
        self.producer = KafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: v.encode('utf-8')
        )

    def send(self, topic_name: str, value: str) -> Any:
        """
        Sends a message to the Kafka topic.
        :param topic_name: Topic name
        :param value: Message value
        :return: Kafka satus response
        """
        future = self.producer.send(topic_name, value)

        return future.get(timeout=KAFKA_PRODUCER_TIMEOUT)
