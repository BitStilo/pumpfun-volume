import pino from "pino";
import fs from "fs";

const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      options: { destination: 1 }, // 1 is stdout
    },
    {
      target: 'pino/file',
      options: { destination: 'app.log' }, // Log to a file
    },
  ],
});

export const logger = pino(
  {
    level: 'info',
    redact: ['poolKeys'],
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  transport,
);