# Serverless Assistant Chat

A simple multi-user web application demonstrating the use of AWS serverless to interact with  [OpenAI Assistant API](https://platform.openai.com/docs/api-reference/assistants), via a simple web chat interface with streaming output. 

Both backend and frontend are implemented with TypeScript.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

<img src="https://raw.githubusercontent.com/jerrydboonstra/serverless-assistant-chat/main/images/screengrab3.gif" alt="screengrab" style="width:75%;">

## Architecture

The architecture of the application is illustrated below:

<img src="https://raw.githubusercontent.com/jerrydboonstra/serverless-assistant-chat/main/images/arch.png" alt="arch" style="width:75%;">


## Setup and Deployment

### Environment

1. Set the filled-in `BACKEND` environment variables **with your own values**. 
    - **Bucket names are globally unique**, so you will at least need to update these.

I use a `.env` file with [direnv](https://direnv.net/). Otherwise prefix these with "export" and execute in your shell.

```sh
# .env
# BACKEND
REGION=us-east-1
STACK_NAME=serverless-assistant-chat
BE_DEPLOYMENT_BUCKET=serverless-assistant-chat
FE_DEPLOYMENT_BUCKET=serverless-assistant-chat-fe
USER_EMAIL=you@example.com
OPENAI_API_KEY=youropenaikeyvalue
OPENAI_API_KEY_NAME=OpenAIAPIKey
OPENAI_SECRET_ARN=arn:aws:secretsmanager:yourregion:youraccount:secret:OpenAIAPIKey-xxxxx
ASSISTANT_ID=

# FRONTEND
USER_POOL_ID=
USER_POOL_WEB_CLIENT_ID=
API_ENDPOINT=wss://xxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
DOMAIN_NAME=
DISTRIBUTION_ID=
```

### Create Assistant Instance

Creating an Assistant instance is a one-time operation, but you can continue to modify it after creation.
There are many methods but two are:

#### Python script
Create an Assistant instance using our python script. Create a Python 3.10+ venv and install the [requirements.txt](admin/requirements.txt).

Optionally update the `instructions` field in [assistant.yml](./admin/assistant.yml).

Deploy it to OpenAI with:

```sh
make upsert-assistant
```

#### Roll your own
Or, using the same account as your `OPENAI_API_KEY` you can roll your own and use the [OpenAI Assistant API v2](https://platform.openai.com/docs/api-reference/chat/create) to create an assistant instance.


#### Output from creation step

Upon success you'll get an assistant ID.  You'll need this.  

- Update the [`assistant.yml`](admin/assistant.yml) file and give the `AssistantId` field this value.
This allows you to update the prompt and update the existing assistant instance.
- add `ASSISTANT_ID=yourvalue` to your environment (.env)

### Backend
Before creating the insfrastructure via the Cloud Formation template, build the backend Lambda code and place it in S3 for the Lambda deployment by following the steps below

#### Create the bucket to hold the built Lambda code
First we create an S3 bucket to hold the deployable Lambda code (remember S3 bucket names are globally unique). 

```sh
make create-backend-bucket
```

#### Build Backend

We then transpile and webpack the backend Typescript code by running the following command

```sh
make build-backend
```

#### Deploy Backend

Finally we build and deploy our Lambda code by running the following command

```sh
make deploy-backend
```

#### Create Secret

We don't want to expose our value of `OPENAI_API_KEY` outside our computer unless its encrypted.

Ensure its set in your environment then run this make target to upload it as an AWS secret. It will be used in our Lambda function.

```sh
make create-secret
```

Update your `.env` file setting the `OPENAI_SECRET_ARN` value from the output from step.

#### Build Backend Lambda Layer

We need to give our backend access to the OpenAI API.  
We do this by creating a Lambda layer that contains the OpenAI NodeJS SDK and dependencies.

```sh
make prepare-layer
```

#### Deploy Backend Lambda Layer

We have to deploy our Lambda layer to S3.

```sh
make create-layer
```

### Infrastructure

Once we have the Lambda artifact built and ready to be deployed, we can deploy the supplied Cloud Formation template that will create all the required infrastructure (Lambda, API Gateway, S3 bucket, CloudFront distro, Cognito items etc.)

#### Create the bucket to hold the frontend code

```sh
make create-frontend-bucket
```

#### Deployment

- Install AWS SAM CLI (if not already installed):
    - Follow the [AWS SAM installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
- Prepare the CloudFormation deployment:
    - `make prepare-cf`
- Deploy the CloudFormation deployment:
    - `make deploy-cf`

#### Cloudformation outputs
When the CloudFormation stack has successfully completed, in the outputs make note of the following parameters that you will need to add to the `.env` file before you build and deploy the frontend code.

Update the `.env` file with the following vars:

- `REGION`, `USER_POOL_ID`, `USER_POOL_WEB_CLIENT_ID`, `API_ENDPOINT`, `DOMAIN_NAME`, `DISTRIBUTION_ID`

### Frontend

#### Build
To build the frontend code, run the following command from the project root directory.

```sh
make build-frontend
```

#### Deploy
To build and deploy the frontend, run the following command from the project root directory. The `FE_DEPLOYMENT_BUCKET` is the name of the bucket provided when deploying the CloudFormation template in the previous step.

```sh
make deploy-frontend
```

#### Use
Check your email for a welcome email from Cognito with a temporary password.

Then you can navidate to the CloudFront domain that was created by the CloudFormation stack (`DOMAIN_NAME`), enter your email address and password and start to use the application.

### Making changes after stack deployment

#### Frontend

Deploying front-end changes take effect immediately.

```sh
make deploy-frontend
```

#### Backend

Deploying backend-end changes require a stack update to take effect.

```sh
make deploy-cf
```

## Reference

- [AWS Serverless Application Model (SAM)](https://aws.amazon.com/serverless/sam/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [AWS API Gateway with Websockets](https://aws.amazon.com/api-gateway/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [OpenAI Assistant API](https://platform.openai.com)    
- [OpenAI NodeJs SDK](https://github.com/openai/openai-node)

Thanks to [Greg Biegel](https://github.com/changamire/serverless-bedrock-chat) for the original CF template.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
