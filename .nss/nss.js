const solid = require('solid-server')
const fs = require('fs');
const path = require('path')

const root = path.join(__dirname, '.data')
const templates = path.join(__dirname, 'config', 'templates', 'new-account')

// Clear out any remnant data from previous tests
fs.rmSync(root, { recursive: true, force: true });
fs.rmSync(path.join(__dirname, 'config'), { recursive: true, force: true });
fs.rmSync(path.join(__dirname, '.db'), { recursive: true, force: true });

// The user details
const details = {
  username: "ownername",
  webId: "http://localhost:8443/profile/card#me",
  name: "ownerName",
  email: "owner@owner.email",
  idp: "http://localhost:8443",
  hashedPassword: "$2a$10$V38ahP7KVOianSZdBQpgR.2TlfgjVTI1KPA7V70XuOPsT8eX6.id."
};

// Start the NSS server
const server = solid({ serverUri: details.idp, root }).listen(8443);

function applyTemplate(dir) {
  for (const elem of fs.readdirSync(dir, { withFileTypes: true })) {
    if (elem.isDirectory())
      applyTemplate(path.join(dir, elem.name));
    else {
      const file = path.join(dir, elem.name);
      const content = fs.readFileSync(file, 'utf8')
        .replace(/\{\{webId\}\}/g, details.webId)
        .replace(/\{\{idp\}\}/g, details.idp)
        .replace(/\{\{name\}\}/g, details.name)
        .replace('{{#if email}}acl:agent <mailto:{{{email}}}>;{{/if}}', `acl:agent <mailto:${details.email}>;`);

      fs.writeFileSync(file, content);
    }
  }
}

// Once the server has started, copy the template data into the users directory and fill it in
server.on('listening', () => {
  fs.cpSync(templates, root, { recursive: true });
  fs.cpSync(path.join(__dirname, 'publicWriteTemplate'), path.join(root, 'publicWrite'), { recursive: true });
  applyTemplate(root);

  // .db isn't created until the next tick so wait until then before creating the user credentials
  setTimeout(() => {
    fs.writeFileSync(
      path.join(__dirname, '.db', 'oidc', 'users', 'users', '_key_localhost%3A8443%2Fprofile%2Fcard%23me.json'),
      JSON.stringify(details)
    );
    fs.writeFileSync(
      path.join(__dirname, '.db', 'oidc', 'users', 'users-by-email', '_key_owner%40owner.email.json'),
      JSON.stringify({ id: "localhost:8443/profile/card#me" })
    );
    console.log('Solid server running on http://localhost:8443/')
  });
});
