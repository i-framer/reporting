import * as dotenv from 'dotenv';
import path from 'path';

// This forces dotenv to look for the .env file in the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
