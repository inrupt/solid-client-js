// TODO: Make this test part of @inrupt/internal-test-env

import {
  addCssPimStorage,
  getNodeTestingEnvironment
} from '@inrupt/internal-test-env';

// Adds a `pim:storage` triple to the WebId
// as several of our E2E tests currently assume
// its' existence.
addCssPimStorage(getNodeTestingEnvironment());
