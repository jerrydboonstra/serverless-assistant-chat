install:
	pip install -r admin/requirements.txt

upsert-assistant:
	python ./admin/create_assistant.py admin/assistant.yml

create-bucket:
	bash ./admin/createDeploymentBucket.sh

create-secret:
	@echo "Creating secret ${OPENAI_API_KEY_NAME} with value from OPENAI_API_KEY"
	@aws secretsmanager create-secret \
		--name ${OPENAI_API_KEY_NAME} \
		--description "OpenAI API Key" \
		--region ${REGION} \
		--secret-string "${OPENAI_API_KEY}"

package-layer:
	mkdir -p tmp && cd tmp || exit 1; \
		rm -rf ../openai-layer.zip; \
		npm install openai && \
		mkdir -p ./layer && \
		mv ../node_modules ./layer/nodejs && \
		zip -r9 ../openai-layer.zip layer; \
		cd .. && rm -rf tmp; rm -rf package.json package-lock.json;

create-layer:
	aws s3 cp ./openai-layer.zip s3://${BE_DEPLOYMENT_BUCKET}/openai-layer.zip

create-assistant:
	python admin/create_assistant.py admin/assistant.yml

clean-backend:
	rm -rf backend/node_modules
	rm -rf backend/dist

clean-frontend:
	rm -rf frontend/node_modules
	rm -rf frontend/www

clean-cf:
	rm -rf packaged-template.yml

BUILD_TIMESTAMP := $(shell date +%s)

build-backend: clean-backend
	cd backend && npm ci && npx webpack && cd dist && zip api-${BUILD_TIMESTAMP}.zip *

build-frontend:
	cd frontend && npm ci && npm run build

deploy-backend: build-backend
	cd backend/dist && aws s3 cp api-${BUILD_TIMESTAMP}.zip s3://${BE_DEPLOYMENT_BUCKET}

update-cf: prepare-cf
	aws cloudformation update-stack \
	--template-body file://packaged-template.yml \
	--stack-name ${STACK_NAME} \
	--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
	--parameters ParameterKey=UserEmail,ParameterValue=${USER_EMAIL} \
		ParameterKey=BucketName,ParameterValue=${FE_DEPLOYMENT_BUCKET} \
		ParameterKey=DeploymentBucketName,ParameterValue=${BE_DEPLOYMENT_BUCKET} \
		ParameterKey=AssistantId,ParameterValue=${ASSISTANT_ID} \
		ParameterKey=OpenAiApiKeyName,ParameterValue=${OPENAI_API_KEY_NAME} \
		ParameterKey=OpenAiApiKeySecretArn,ParameterValue=${OPENAI_SECRET_ARN} \
		ParameterKey=BuildTimestamp,ParameterValue=${BUILD_TIMESTAMP}

deploy-frontend: build-frontend
	cd frontend/ && aws s3 cp www s3://${FE_DEPLOYMENT_BUCKET} --recursive

prepare-cf:
	sam package \
	  --template-file cloudFormation.yml \
	  --s3-bucket ${BE_DEPLOYMENT_BUCKET} \
	  --output-template-file packaged-template.yml

deploy-cf: deploy-backend prepare-cf
	sam deploy \
		--template-file packaged-template.yml \
		--stack-name ${STACK_NAME} \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
		--parameter-overrides \
			UserEmail=${USER_EMAIL} \
			BucketName=${FE_DEPLOYMENT_BUCKET} \
			DeploymentBucketName=${BE_DEPLOYMENT_BUCKET} \
			AssistantId=${ASSISTANT_ID} \
			OpenAiApiKeyName=${OPENAI_API_KEY_NAME} \
			OpenAiApiKeySecretArn=${OPENAI_SECRET_ARN} \
			BuildTimestamp=${BUILD_TIMESTAMP}

validate-cf: prepare-cf
	sam validate --template-file packaged-template.yml

deploy: deploy-backend deploy-frontend deploy-cf

all: install create-bucket package-layer create-layer create-assistant deploy

open:
	open "https://${DOMAIN_NAME}"

start:
	cd frontend && npm start
