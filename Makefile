install:
	pip install -r admin/requirements.txt

upsert-assistant:
	python ./admin/create_assistant.py admin/assistant.yml

create-backend-bucket:
	OUR_BUCKET=${BE_DEPLOYMENT_BUCKET} bash ./admin/create_bucket.sh 

create-frontend-bucket:
	OUR_BUCKET=${FE_DEPLOYMENT_BUCKET} bash ./admin/create_bucket.sh 

create-secret:
	@echo "Creating secret ${OPENAI_API_KEY_NAME} with value from OPENAI_API_KEY"
	@aws secretsmanager create-secret \
		--name ${OPENAI_API_KEY_NAME} \
		--description "OpenAI API Key" \
		--region ${REGION} \
		--secret-string "${OPENAI_API_KEY}"

package-layer: clean-layer
	@cd layer && npm install && \
		mv node_modules nodejs && \
		cd .. && \
		zip -r9 openai-layer.zip layer && \
		rm -rf layer/nodejs

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

clean-layer:
	rm -rf layer/node_modules
	rm -rf layer/nodejs
	rm -rf openai-layer.zip

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
	@cd frontend/ && aws s3 cp www s3://${FE_DEPLOYMENT_BUCKET} --recursive
	@sleep 1 && $(MAKE) flush-cache

prepare-cf:
	sam package \
	  --template-file cloudFormation.yml \
	  --s3-bucket ${BE_DEPLOYMENT_BUCKET} \
	  --output-template-file packaged-template.yml

deploy-cf: deploy-backend prepare-cf lint-cf
	sam deploy \
		--template-file packaged-template.yml \
		--stack-name ${STACK_NAME} \
		--region ${REGION} \
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

lint-cf: prepare-cf
	sam validate --template-file packaged-template.yml --lint

deploy: deploy-backend deploy-frontend deploy-cf

all: install create-backend-bucket create-frontend-bucket create-secret package-layer create-layer create-assistant deploy

open:
	open "https://${DOMAIN_NAME}"

start:
	cd frontend && npm start

flush-cache:
	aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*" --no-cli-pager

destroy:
	@sam delete --stack-name ${STACK_NAME} --region ${REGION} --s3-bucket ${FE_DEPLOYMENT_BUCKET}
	@echo "Run 'make destroy-backend-bucket' to delete the backend bucket"
	@echo "Run 'make destroy-frontend-bucket' to delete the frontend bucket"

destroy-backend-bucket:
	aws s3 rm s3://${BE_DEPLOYMENT_BUCKET} --recursive
	aws s3api delete-bucket \
		--bucket ${BE_DEPLOYMENT_BUCKET} --region ${REGION}

destroy-frontend-bucket:
	aws s3 rm s3://${FE_DEPLOYMENT_BUCKET} --recursive
	aws s3api delete-bucket \
		--bucket ${FE_DEPLOYMENT_BUCKET} --region ${REGION}
