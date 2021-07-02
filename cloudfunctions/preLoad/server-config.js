const serverType = {
  Sas: 'Sas',
  CGIProxy: 'CGIProxy',
};

exports.serverType = serverType;

exports.serverConfig = {
  [serverType.Sas]: {
    domain: 'https://sas.qq.com',
    modid: 472577,
    cmdid: 327680,
  },
  [serverType.CGIProxy]: {
    domain: 'https://m.ke.qq.com',
    modid: 192001985,
    cmdid: 74928,
  },
};
