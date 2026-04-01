/**
 * Template-alignment scaffold for the redpacket-server style schema layer.
 *
 * The active runtime remains the existing Express REST app. This module is
 * intentionally inert and documents the future seam where schema-first entry
 * points could be introduced without changing current behavior.
 */
const templateSchemaScaffold = {
  runtime: 'express-rest',
  templateTarget: 'redpacket-server',
  status: 'scaffold-only',
};

module.exports = {
  templateSchemaScaffold,
};
