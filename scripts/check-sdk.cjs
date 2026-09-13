const common = require('tencentcloud-sdk-nodejs/tencentcloud/common');
console.log('common keys:', Object.keys(common).slice(0, 15));
console.log('Credential:', typeof common.Credential);
console.log('ClientProfile:', typeof common.ClientProfile);
console.log('HttpProfile:', typeof common.HttpProfile);
