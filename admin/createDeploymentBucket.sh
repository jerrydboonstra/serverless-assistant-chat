aws s3api head-bucket --bucket $BE_DEPLOYMENT_BUCKET || not_exist=true
if [ $not_exist ]; then
  echo "Creating Lambda deployment bucket"
  echo $DEPLOYMENT_BUCKET
  aws s3api create-bucket --acl private --bucket $BE_DEPLOYMENT_BUCKET --create-bucket-configuration LocationConstraint=$AWS_REGION
else
  echo "Lambda deployment bucket exists"
fi
