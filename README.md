# Football Match Data Processor

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

Football Match Data Processor is a serverless application that processes and analyzes football match data in real-time.

The purpose of this project is to demonstrate Amazon Web Services (AWS) capabilities of batch data processing by means of the following technology stack:
- AWS CDK
- AWS API Gateway
- AWS MSK Kafka
- AWS Lambda
- AWS Step Function
- AWS Dynamo DB
- AWS S3
- TypeScript and Python

---

## Table of Contents

- [Features](#features)
- [Components](#components)
- [CDK Stacks](#cdk-stacks)
- [Configuration](#configuration)
- [REST API](#rest-api)
- [Deployment](#deployment)
- [Unit testing](#unit-testing)
- [End-to-end testing](#end-to-end-testing)
- [Contact](#contact)

---

## Features

- Feature 1: Ingestion of Football Match events
- Feature 2: Batch processing of Football Match events
- Feature 3: Storing raw Football Match events
- Feature 4: Storing enriched Football Match data
- Feature 5: Fetching Football Match statistics

---

## Components

1. **API Gateway**
- Exposes API endpoints: [REST API](#rest-api)
- Triggers Ingest Lambda to ingest incoming Match events
- Triggers Query Lambda to fetch Match statistics
2. **Topic Lambda**
- Prepares MSK topic before MSK trigger is configured
- [TypeScript code](lambda/topic)
3. **Ingest Lambda**
- Processes API requests:
  - POST matches/event
- Validates incoming Match events
- Submits Match events to MSK Kafka queue
- [Python code](lambda/ingest)
4. **Query Lambda**
- Processes API requests:
  - GET matches/{match_id}/goals
  - GET matches/{match_id}/passes
- Fetches Match statistics from Dynamo DB
- [Python code](lambda/query)
5. **Consume Lambda**
- Prepares Match events for Batch processing
- Initiates Step Function workflow to trigger enrichment and storing of Match data
- [Python code](lambda/process/consume)
6. **Enrich Lambda**
- Enriches a batch of Match events
- [Python code](lambda/process/enrich)
7. **Store Lambda**
- Stores batches of raw and enriched Match data in S3 and DynamoDB
- [Python code](lambda/process/store)
8. **MSK Kafka**
- Accepts Match events for processing
- Triggers Consume Lambda to prepare Match events for Batch processing
9. **DynamoDB**
- Stores enriched Match data
10. **S3**
- Stores raw Match events

---

## CDK Stacks

1. **Network**
- Creates VPC for MSK and Security Group
- [TypeScript code](lib/network-stack.ts)
2. **Storage**
- Creates S3 and DynamoDB resources
- [TypeScript code](lib/storage-stack.ts)
3. **MSK**
- Creates MSK cluster and Topic lambda
- [TypeScript code](lib/msk-stack.ts)
4. **Gateway**
- Creates API endpoints and API lambdas
- [TypeScript code](lib/gateway-stack.ts)
5. **Application**
- Creates processing lambdas, Step Function State Machine and MSK trigger
- [TypeScript code](lib/football-match-data-processor-stack.ts)

---

## Configuration

There is no special configuration layer for environments.
However, the following Batch processing parameters can be updated here [TypeScript code](bin/football-match-data-processor.ts):

- processingBatchSize - max number of Match events to process in a batch
- processingBatchWindow - how many seconds to wait for a larger batch
- maxProcessingTime - max timeout for processing Lambdas (Consume, Enrich and Store operations)

---

## REST API

1. **Send Match event**
- Endpoint: `/matches/event`
- Method: `POST`
- Headers:
   - `Content-Type: application/json`
- Request Body:
   ```json
   {
      "match_id": "000001",
      "event_type": "goal",
      "team": "Team A",
      "player": "Player 1",
      "timestamp": "2023-10-15T14:30:00Z"
   }
   ```
- Response:
   - Success (200)
      ```json
      {
         "message": "Match event ingested OK",
         "event_id": "550e8400-e29b-41d4-a716-446655440000"
      }
      ```
   - Error (400)
      ```json
      {
         "message": "Invalid input data"
      }
      ```
2. **Get Match goals**
- Endpoint: `/matches/{match_id}/goals`
- Method: `GET`
- Response:
   - Success (200)
      ```json
      {
         "match_id": "000001",
         "event_type": "goal",
         "count": 3
      }
      ```
3. **Get Match passes**
- Endpoint: `/matches/{match_id}/passes`
- Method: `GET`
- Response:
   - Success (200)
      ```json
      {
         "match_id": "000001",
         "event_type": "pass",
         "count": 3
      }
      ```

:information_source: **Note** The Postman collection can be used to send REST API requests: [Postman collection](postman). Please check also [End-to-end testing](#end-to-end-testing).

:information_source: **Note:** All endpoints do not require authentication for demonstration purposes.

---

## Deployment

:exclamation: **Important:**
The following steps have been tested on MacOS only.

Prerequisites:

- installed Node.js, AWS CLI 2
- AWS account, authorized AWS user to deploy CloudFormation stacks
- configured AWS CLI (Access key, Secret Key, Region, etc.)

1. Clone the repository:
   ```bash
   git clone https://github.com/olfisoft/football-match-data-processor.git
   cd football-match-data-processor
   ```
2. Install AWS CDK:
   ```bash
   npm install aws-cdk-lib
   ```
3. Set up environment variables:
   ```bash
   export CDK_DEFAULT_ACCOUNT=<Your AWS Account Id>
   export CDK_DEFAULT_REGION=<Your AWS Region>
   ```

:information_source: **Note:** environment variables are used to deploy the infrastructure here: [TypeScript code](bin/football-match-data-processor.ts)

4. Deploy the application Stacks, confirm their deployment:
   ```bash
   npx cdk deploy --all
   ```

:warning: **Note:** deployment of MSK stack can take about 30 min of time.

5. Save API URL from the console output, e.g. it can look like:
   ```bash
   Outputs:
   FootballMatchDataProcessorGatewayStack = https://te3pbpumd7.execute-api.us-east-1.amazonaws.com/prod/
   ```

Where 'API URL' = https://te3pbpumd7.execute-api.us-east-1.amazonaws.com/prod

6. Use API URL to run [End-to-end testing](#end-to-end-testing).

:exclamation: **Important:**
Destroy the stacks after testing to avoid costs such as those caused by running MSK etc.
   ```bash
   npx cdk destroy --all
   ```

---

## Unit testing

### Stacks

Prerequisites: installed Node.js, Jest

- Infrastructure unit test: [TypeScript code](test)
- Run the unit test:
   ```bash
   cd football-match-data-processor
   npx jest test/football-match-data-processor.test.ts
   ```

:warning: **Note:** AWS CDK Stack tests are still under development.  

### Lambdas

Prerequisites: installed Python, Pytest

1. **Ingest Lambda**
- Tests that Ingest lambda validates Match events
- Unit test: [Python code](lambda/ingest/test)
- Run the unit test:
   ```bash
   cd football-match-data-processor/lambda/ingest/test
   export FMDP_TEST_ENV=true
   PYTHONPATH=.. pytest test_lambda_function.py
   ```
2. **Enrich Lambda**
- Tests that Enrich lambda enriches Match events
- Unit test: [Python code](lambda/process/enrich/test)
- Run the unit test:
   ```bash
   cd football-match-data-processor/lambda/process/enrich/test
   PYTHONPATH=.. pytest test_lambda_function.py
   ```

---

## End-to-end testing
1. Deploy the application and get API URL as described in [Deployment](#deployment).
2. Update the API URL in the prerequest script of Postman or terminal command line to send a request.
3. Send a new Match event in Postman or terminal command line, e.g.:
   ```bash
   curl --location '<API URL>/matches/event' \
   --header 'Content-Type: application/json' \
   --data '{
      "match_id": "00000001",
      "event_type": "pass",
      "team": "Team A",
      "player": "Player 1",
      "timestamp": "2023-10-15T14:30:00Z"
   }'
   ```
4. Get Match statistics of goals in Postman or terminal command line, e.g.:
   ```bash
   curl --location '<API URL>/matches/00000001/goals'
   ```
5. Get Match statistics of passes in Postman or terminal command line, e.g.:
   ```bash
   curl --location '<API URL>/matches/00000001/passes'
   ```
6. Use the Postman collection to get more information about [REST API](#rest-api).

---

## Contact

**Eugene Kuzmin**  
Software engineer and architect passionate about building Cloud scalable applications.

- [Email](mailto:olfisoft@gmail.com)

---
