// 引入waline-tscf/server
const waline = require('@waline-tscf/server');

// 入口函数
exports.main_handler = async (event, context) => {
  // console.log('【serverless】event参数:', JSON.stringify(event, null, 2));
  // console.log('【serverless】context参数:', JSON.stringify(context, null, 2));
  console.log('【serverless】转发请求到waline');
  try {
    const response = await waline({ 
      event,
      // 这里可以添加其他配置参数
      // database: {...},
      // secureDomains: [...],
    });
    // console.log('【serverless】响应参数', JSON.stringify(response, null, 2));
    return {
      isBase64Encoded: false,
      statusCode: response.statusCode,
      headers: {
        ...response.headers,
        'Content-Type': 'application/json',
      },
      body: typeof response.body === 'string' 
        ? response.body 
        : JSON.stringify(response.body || {})
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: '服务器内部错误',
        details: err.message 
      })
    };
  }
};