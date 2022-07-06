// Fix the timezone to avoid flaky tests on locale
// dependent functions
module.exports = async () => {
  process.env.TZ = 'UTC';
};
