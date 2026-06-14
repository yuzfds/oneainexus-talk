import packageJson from '../package.json';

type ConnectorPackageJson = {
  name?: string;
  version?: string;
};

const pkg = packageJson as ConnectorPackageJson;

export const CONNECTOR_PACKAGE_NAME = pkg.name ?? '@oneainexus/openclaw-connector';
export const CONNECTOR_VERSION = pkg.version ?? 'unknown';
export const CONNECTOR_VERSION_LABEL = `${CONNECTOR_PACKAGE_NAME}@${CONNECTOR_VERSION}`;
