import { testTypes } from './constants';

export type TestType = typeof testTypes[number];

export type EnvVars = {
  SP_TEST_DIR: string;
  SP_TEST_TYPE: TestType;
  SP_VERBOSE: 'true' | '';
  SP_TRACE: 'true' | '';
};

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

type GatsbyTimings = {
  // How much it usually takes to start Gatsby.
  startTimeout?: number;
  // How much it usually takes to refresh Gatsby.
  refreshTimeout?: number;
  // How often to check for Gatsby readiness.
  retryInterval?: number;
};

type DrupalConfig = {
  graphQlEndpoint: string;
  authKey: string;
};

export type Config = {
  drupal: {
    // Path to Drupal root relative to the tested package.
    path: string;
  };
  gatsby?: {
    // Path to Gatsby root relative to the tested package.
    path: string;
    develop: {
      // Used to fetch drupalBuildId.
      drupal: DrupalConfig;
      timings?: GatsbyTimings;
    };
    build: {
      // Used to fetch drupalBuildId.
      drupal: DrupalConfig;
      timings?: GatsbyTimings;
    };
  };
};

export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${JSON.stringify(val)}`);
  }
}
