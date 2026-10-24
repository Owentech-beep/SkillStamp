export function fail(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
export function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}
export function profileFields(body) {
  const { name, location = '', skills = [], about = '' } = body ?? {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)
    throw fail(400, 'Enter a name between 2 and 100 characters.');
  if (typeof location !== 'string' || location.length > 150 || typeof about !== 'string' || about.length > 2000 || !Array.isArray(skills) || skills.length > 20 || skills.some(s => typeof s !== 'string' || s.length > 60))
    throw fail(400, 'Check your location, bio and skills. Maximum: 150 location characters, 2,000 bio characters and 20 skills of 60 characters.');
  return { name: name.trim(), location: location.trim(), about: about.trim(), skills: [...new Set(skills.map(s => s.trim()).filter(Boolean))] };
}
