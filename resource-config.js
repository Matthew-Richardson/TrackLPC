// Resolved through the signed-in ArcGIS session; no public sharing is needed.
// Optional tableUrl override: paste an exact /FeatureServer/<table ID> URL.
window.LPC_RESOURCE_CONFIG = {
  serviceUrl: 'https://services2.arcgis.com/ilLrLpXfElYxSy9y/arcgis/rest/services/LPCOEM_Resource/FeatureServer',
  tableUrl: '',
  // Separate private services; table IDs are discovered through the signed-in session.
  inventoryTableUrl: 'https://services2.arcgis.com/ilLrLpXfElYxSy9y/arcgis/rest/services/Resource_Inventory/FeatureServer',
  operationsTableUrl: 'https://services2.arcgis.com/ilLrLpXfElYxSy9y/arcgis/rest/services/Resource_Operations/FeatureServer'
};
