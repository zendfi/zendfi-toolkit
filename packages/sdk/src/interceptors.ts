/**
 * Request/Response Interceptor System
 * 
 * Allows modifying requests before they're sent and responses after they're received
 */

export interface RequestConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  config: RequestConfig;
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: ResponseData) => ResponseData | Promise<ResponseData>;
export type ErrorInterceptor = (error: Error) => Error | Promise<Error>;

/**
 * Interceptor Manager
 */
export class InterceptorManager<T extends (...args: any[]) => any> {
  private handlers: (T | null)[] = [];

  /**
   * Add an interceptor
   */
  use(handler: T): number {
    this.handlers.push(handler);
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor
   */
  eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  /**
   * Execute all interceptors in sequence
   */
  async execute(initialValue: Parameters<T>[0]): Promise<ReturnType<T>> {
    let result: any = initialValue;
    
    for (const handler of this.handlers) {
      if (handler !== null) {
        result = await handler(result);
      }
    }
    
    return result;
  }

  /**
   * Check if any interceptors are registered
   */
  has(): boolean {
    return this.handlers.some(h => h !== null);
  }

  /**
   * Clear all interceptors
   */
  clear(): void {
    this.handlers = [];
  }
}

/**
 * Interceptors collection
 */
export interface Interceptors {
  request: InterceptorManager<RequestInterceptor>;
  response: InterceptorManager<ResponseInterceptor>;
  error: InterceptorManager<ErrorInterceptor>;
}

/**
 * Create interceptors instance
 */
export function createInterceptors(): Interceptors {
  return {
    request: new InterceptorManager<RequestInterceptor>(),
    response: new InterceptorManager<ResponseInterceptor>(),
    error: new InterceptorManager<ErrorInterceptor>(),
  };
}
