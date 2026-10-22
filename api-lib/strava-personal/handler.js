import {createPersonalRoutes} from './routes.js';
import {getSupabaseAdmin} from '../supabaseAdmin.js';
import {requireAdmin} from '../requireAdmin.js';
// Personal flag/origin/app/DB checks run before constructing any DB client.
export default createPersonalRoutes({env:process.env,getDb:getSupabaseAdmin,authorizeOwner:requireAdmin});
