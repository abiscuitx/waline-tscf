const waline = require('@waline-tscf/server');

// 导出云函数处理方法
exports.main_handler = async (event, context) => {
  // console.log('[函数] 收到新请求 - event参数:', JSON.stringify(event, null, 2));
  // console.log('[函数] 收到新请求 - context参数:', JSON.stringify(context, null, 2));
  
  try {
    // 创建Waline实例并处理请求，传入完整的配置对象
    console.log('[函数] 转发请求到Waline');
    // 使用 await 等待 waline 处理完成
    const response = await waline({ 
      event,
      // 这里可以添加其他配置参数
      // database: {...},
      // secureDomains: [...],
    });
    // console.log('[函数] 响应处理完成', JSON.stringify(response, null, 2));
    
    // 返回符合腾讯云函数规范的响应格式
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
    console.error('[函数] 请求处理失败:', err);
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