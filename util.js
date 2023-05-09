// helper function to generate a random reference
export function generateReference(length){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for ( let i = 0; i < length; i++ )
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
