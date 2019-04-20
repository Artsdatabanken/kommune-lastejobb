const { io, log } = require("lastejobb");

const lesSparqlOutput = fil => io.lesDatafil(fil).items.results.bindings;

function konverter(nivå) {
  const r = lesElementer(nivå, "item");
  flettKoder(r, nivå);
  flettNaboer(r, nivå);
  flettMedBilder(r, nivå);
  const arr = mapTilArray(r);
  arr.sort((a, b) => (a.code > b.code ? 1 : -1));
  debugger;
  const dok = {
    items: arr,
    meta: {
      url: `https://github.com/Artsdatabanken/kommune-data/blob/master/${nivå}.json`
    }
  };
  io.skrivBuildfil(nivå, dok);
}

function mapTilArray(r) {
  const values = Object.values(r);
  return values.reduce((acc, e) => {
    if (e.dissolved < new Date()) return acc;
    if (e.inception > new Date()) return acc;
    if (!e.code) return acc;
    acc.push(e);
    return acc;
  }, []);
}

function lesElementer(filnavn, nøkkelfelt) {
  const elementer = lesSparqlOutput(filnavn);
  const r = {};
  elementer.forEach(e => {
    const k = map(e);
    const nøkkel = k[nøkkelfelt];
    r[nøkkel] = k;
  });
  return r;
}

function map(e) {
  const r = {};
  Object.entries(e).forEach(([key, v]) => {
    r[key] = value(v);
  });
  return r;
}

function value(e) {
  if (!e) return null;
  switch (e.datatype) {
    case "http://www.w3.org/2001/XMLSchema#dateTime":
      return new Date(e.value);
    case "http://www.w3.org/2001/XMLSchema#decimal":
      return parseFloat(e.value);
    default:
      return e.value;
  }
}

function flettKoder(r, nivå) {
  if (nivå !== "kommune") return;
  const nummer = lesSparqlOutput(nivå + "nummer");
  nummer.forEach(e => {
    const id = e.kommune.value;
    const item = r[id];
    const fra = value(e.start_time);
    const til = value(e.end_time);
    if (fra && fra > new Date()) return;
    if (til && til < new Date()) return;

    item.code = value(e.knr);
  });
}

function flettNaboer(r, nivå) {
  const nabo = lesSparqlOutput(nivå + "nabo");
  nabo.forEach(e => {
    const idFra = e.item.value;
    const idTil = e.shares_border_with.value;
    const fra = r[idFra];
    const til = r[idTil];
    if (!til) return; // ligger ikke i Norge
    fra.naboer = [...(fra.naboer || []), til.code].sort();
  });
}

function flettMedBilder(r, nivå) {
  const bilde = lesSparqlOutput(nivå + "bilde");
  bilde.forEach(e => {
    const id = e.item.value;
    const fra = r[id];
    fra.images = fra.images || [];
    fra.banners = fra.banners || [];
    const image = value(e.image);
    if (image) fra.images.push(image);
    const banner = value(e.banner);
    if (banner) fra.banners.push(banner);
  });
}

module.exports = { konverter };
