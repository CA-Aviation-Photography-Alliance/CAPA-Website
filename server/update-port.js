#!/usr/bin/env node

/**
 * Port Update Script for CAPA Website Server
 *
 * This script replaces all occurrences of port 3003 with port 3003
 * across all server files and documentation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
