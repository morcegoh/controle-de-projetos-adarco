import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPodcast() {
  console.log('Updating Podcast project status to IN_PROGRESS...');
  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'IN_PROGRESS' })
    .eq('title', 'Podcast');

  if (error) {
    console.error('Error updating project:', error.message);
  } else {
    console.log('Project updated successfully.');
  }
}

fixPodcast();
