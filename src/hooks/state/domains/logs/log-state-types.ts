export type LogEvent = {
  id: string;
  type: string;
  timestamp: string;
  payload?: any;
};

export type LogState = {
  logs: LogEvent[];
};

