import { giantFixture } from './p2-giant-fixture';
import { serializeWorld } from '../src/sim/save';
process.stdout.write(serializeWorld(giantFixture()));
