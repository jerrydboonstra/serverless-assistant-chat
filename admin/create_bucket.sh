#!/bin/bash
set -eEuo pipefail

not_exist=
aws s3api head-bucket --bucket $OUR_BUCKET &>/dev/null || not_exist=true
if [ $not_exist ]; then
  echo "Creating Lambda deployment bucket"
  echo $OUR_BUCKET
  aws s3api create-bucket --acl private --bucket $OUR_BUCKET --create-bucket-configuration LocationConstraint=$REGION --no-cli-pager
else
  echo "Lambda deployment bucket exists"
fi
