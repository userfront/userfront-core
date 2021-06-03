/**
 * Get the value of a query attribute, e.g. ?attr=value
 * @param {String} attrName
 */
export function getQueryAttr(attrName) {
  if (
    !window.location.href ||
    window.location.href.indexOf(`${attrName}=`) < 0
  ) {
    return;
  }
  return decodeURIComponent(
    window.location.href.split(`${attrName}=`)[1].split("&")[0]
  );
}
