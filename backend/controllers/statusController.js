exports.status = (req, res) => {
  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
  const waCloudConfigured = !!(process.env.WA_CLOUD_TOKEN && process.env.WA_PHONE_ID);
  const serverNumber = process.env.WA_SERVER_NUMBER || (process.env.TWILIO_WHATSAPP_FROM ? process.env.TWILIO_WHATSAPP_FROM.replace('whatsapp:', '') : null);

  res.status(200).json({
    success: true,
    twilioConfigured,
    waCloudConfigured,
    outboundConfigured: twilioConfigured || waCloudConfigured,
    serverNumber: serverNumber || null,
    env: process.env.NODE_ENV || 'development'
  });
};
