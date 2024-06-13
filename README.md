# Serverless Assistant Chat

A simple serverless web application demonstrating the use of OpenAI Assistant API to interact with an LLM via a simple web chat interface. 
Both backend and frontend are implemented with TypeScript.

The architecture of the application is illustrated below:-

![Architecture](images/architecture.png)

## Environment

Set these environment variables with your own values. Bucket names are globally unique.

I use a `.env` file with `direnv`. Otherwise prefix these with "export".

```sh
# BACKEND
AWS_REGION=us-east-2
STACK_NAME=serverless-assistant-chat
BE_DEPLOYMENT_BUCKET=serverless-assistant-chat
FE_DEPLOYMENT_BUCKET=serverless-assistant-chat-fe
USER_EMAIL=you@example.com
OPENAI_API_KEY=yourkey
ASSISTANT_ID=

# FRONTEND
REGION=                     # Your AWS region
USER_POOL_ID=               # `CognitoUserPoolID` - the user pool id
USER_POOL_WEB_CLIENT_ID=    # `CognitoAppClientID` - the app client id
API_ENDPOINT=               # `ServiceEndpointWebsocket` - the address of the API Gateway WebSocket
DOMAIN_NAME=                # `DomainName` - the domain of the CloudFront distribution
```

## Remote Assistant

Create an Assistant instance at OpenAI using our script.

This is in python, create a venv 3.10+ and install the [requirements.txt](requirements.txt).

```sh
python ./admin/create_assistant.py admin/assistant.yml
```

Upon success you'll get an assistant ID.  You'll need this.  

- Update the [`assistant.yml`](admin/assistant.yml) file and give the `AssistantId` field this value.
This allows you to update the prompt and update the existing assistant instance.
- add `ASSISTANT_ID=yourvalue` to your environment (.env)

## Backend
Before creating the insfrastructure via the Cloud Formation template, build the backend
Lambda code and place it in S3 for the Lambda deployment by following the steps below

### Create the bucket to hold the built Lambda code
First we create an S3 bucket to hold the deployable Lambda code (remember S3 bucket names are globally unique). 

```sh
./admin/createDeploymentBucket.sh
```

### Build Backend

We then transpile and webpack the backend Typescript code by running the following command

```sh
make build-backend
```

### Deploy Backend

Finally we upload the built artifact by running the following command

```sh
make deploy-backend
```

### Build Backend Lambda Layer

We need to give our backend access to the OpenAI API.  
We do this by creating a Lambda layer that contains the OpenAI Python SDK and dependencies.

```sh
make prepare-layer
```

### Deploy Backend Lambda Layer

We have to deploy our Lambda layer to S3.

```sh
make create-layer
```

## Infrastructure

Once we have the Lambda artifact built and ready to be deployed, we can deploy the supplied Cloud Formation template that will create all the required infrastructure (Lambda, API Gateway, S3 bucket, CloudFront distro, Cognito items etc.)

### Deployment

- Install AWS SAM CLI (if not already installed):
    - Follow the [AWS SAM installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
- Prepare the CloudFormation deployment:
    - `make prepare-cf`
- Deploy the CloudFormation deployment:
    - `make deploy-cf`

### Cloudformation outputs
When the CloudFormation stack has successfully completed, in the outputs make note of the following parameters that you will need to add to the `.env` file before you build and deploy the frontend code.

Update the `.env` file with the following vars:

- `REGION`, `USER_POOL_ID`, `USER_POOL_WEB_CLIENT_ID`, `API_ENDPOINT`, `DOMAIN_NAME`

## Frontend

### Build
To build the frontend code, run the following command from the project root directory.

```sh
make build-frontend
```

### Deploy
To deploy the frontend, run the following command from the project root directory. The `FE_DEPLOYMENT_BUCKET` is the name of the bucket provided when deploying the CloudFormation template in the previous step.

```sh
make deploy-frontend
```

### Use
Check your email for a welcome email from Cognito with a temporary password.

Then you can navidate to the CloudFront domain that was created by the CloudFormation stack (`DOMAIN_NAME`), enter your email address and password and start to use the application.

![Screengrab](images/screengrab.gif)

## Making changes after stack deployment

### Frontend

Deploying front-end changes take effect immediately.

```sh
make deploy-frontend
```

### Backend

Deploying backend-end changes require a stack update to take effect.

```sh
make deploy-cf
```
