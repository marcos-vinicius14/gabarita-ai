/**
 * Database Seed Script
 * 
 * Creates default admin user if it doesn't exist.
 * Run with: pnpm db:seed
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { uuidv7 } from 'uuidv7';
import { hashPassword } from '../server/utils/auth/password';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gabarita.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminSecure123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrador';

async function seed() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('[Seed] Connecting to database...');

        const existingAdmin = await pool.query(
            'SELECT id FROM tb_users WHERE email = $1',
            [ADMIN_EMAIL]
        );

        if (existingAdmin.rows.length > 0) {
            console.log(`[Seed] Admin user already exists: ${ADMIN_EMAIL}`);
            return;
        }

        const userId = uuidv7();
        const passwordHash = await hashPassword(ADMIN_PASSWORD);

        await pool.query(
            `INSERT INTO tb_users (id, email, password_hash, name, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'admin', NOW(), NOW())`,
            [userId, ADMIN_EMAIL, passwordHash, ADMIN_NAME]
        );

        console.log(`[Seed] ✅ Admin user created:`);
        console.log(`       Email: ${ADMIN_EMAIL}`);
        console.log(`       Password: ${ADMIN_PASSWORD}`);
        console.log(`       ID: ${userId}`);
    } catch (error) {
        console.error('[Seed] Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
