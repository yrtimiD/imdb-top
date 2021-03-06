const tsv_json = require('tsv-json');
const fs = require('fs');
const { performance, PerformanceObserver } = require('perf_hooks');

const RATINGS_TSV = 'ratings.tsv';
const RATINGS_JSON = 'ratings.json';

const TITLES_TSV = 'titles.tsv';
const TITLES_JSON = 'titles.json';
const TYPES_JSON = 'types.json';

function load(jsonFile) {
	if (fs.existsSync(jsonFile)) {
		return JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
	} else {
		console.error(`${jsonFile} does not exist. Run: npm start create`);
		process.exit(2);
	}
}

function createRatings(tsvInput, jsonOutput) {
	/*
		weighted rating (WR) = (v ÷ (v+m)) × R + (m ÷ (v+m)) × C
		Where:
		R = average for the movie (mean) = (rating)
		v = number of votes for the movie = (votes)
		m = minimum votes required to be listed in the Top Rated list (currently 25,000)
		C = the mean vote across the whole report
	 */

	const ratingsTsv = fs.readFileSync(tsvInput, 'utf8');
	const allRatings = tsv_json.tsv2json(ratingsTsv).slice(1).map(i => ({ id: i[0], r: parseFloat(i[1]), v: parseInt(i[2]) }));

	const C = allRatings.reduce((p, c) => p + c.r, 0) / allRatings.length;
	const m = 25000;
	const ratings = allRatings.map(r => {
		const wr = (r.v / (r.v + m) * r.r) + ((m / (r.v + m)) * C);
		return {
			...r,
			wr: Math.round(wr * 10000) / 10000
		};
	});

	const orderedRatings = ratings.sort((a, b) => b.wr - a.wr);

	console.log(`Saving ${orderedRatings.length} ratings to ${jsonOutput}`);
	fs.writeFileSync(jsonOutput, JSON.stringify(orderedRatings));
}

function createFromTitles(tsvIn, jsonOut, name, columnIndex) {
	performance.mark(`${name}-start`);
	let data = null;

	performance.mark(`titles_tsv-load-start`);
	const titlesTsv = fs.readFileSync(tsvIn, 'utf8');
	performance.measure('titles.tsv load', 'titles_tsv-load-start');

	performance.mark(`${name}-convert-start`);
	const dataRaw = tsv_json.tsv2json(titlesTsv).slice(1);
	performance.measure(`${name} convert`, `${name}-convert-start`);
	delete titlesTsv;

	performance.mark(`${name}-build-start`);
	data = dataRaw.reduce((p, c) => { p[c[0]] = c[columnIndex]; return p; }, {});
	performance.measure(`${name} build`, `${name}-build-start`);
	delete dataRaw;

	console.log(`Saving ${dataRaw.length} ${name} to ${jsonOut}`);
	fs.writeFileSync(jsonOut, JSON.stringify(data));
	performance.measure(`${name} total`, `${name}-start`);

	return data;
}

function calcWR(topN, type) {

	const ratings = load(RATINGS_JSON);
	console.log(`Loaded ${ratings.length} ratings`);

	const titles = load(TITLES_JSON);
	console.log(`Loaded ${Object.keys(titles).length} titles`);

	const types = load(TYPES_JSON);
	console.log(`Loaded ${Object.keys(types).length} types`);


	const top = ratings
		.filter(r => types[r.id] === type)
		.slice(0, topN)
		.map(r => ({ ...r, title: titles[r.id] }));

	const topArray = [['link', 'id', 'WR', 'Title'], ...top.map(r => [`https://www.imdb.com/title/${r.id}`, r.id, r.wr.toString(), r.title])];
	const topTsv = tsv_json.json2tsv(topArray);
	const topTsvFile = `top_${topN}.tsv`;
	fs.writeFileSync(topTsvFile, topTsv);
	console.log(`Top ${topN} is saved to ${topTsvFile}`);
}

const obs = new PerformanceObserver((entries) => {
	entries.getEntries().forEach(e => { console.log(`${e.name}: ${Math.round(e.duration / 100) / 10} sec`); });
	performance.clearMarks();
});

obs.observe({ entryTypes: ["measure"] });

if (process.argv.length > 2) {
	const [_, __, command, param] = process.argv;

	switch (command) {
		case 'create-ratings':
			console.log(`Creating ${RATINGS_JSON}...`)
			createRatings(RATINGS_TSV, RATINGS_JSON);
			break;
		case 'create-titles':
			console.log(`Creating ${TITLES_JSON}...`)
			createFromTitles(TITLES_TSV, TITLES_JSON, 'titles', 2);
			break;
		case 'create-types':
			console.log(`Creating ${TYPES_JSON}...`)
			const types = createFromTitles(TITLES_TSV, TYPES_JSON, 'types', 1);
			const uniqueTypes = new Set(Object.values(types));
			if (!fs.existsSync('types_list.txt')) fs.writeFileSync('types_list.txt', Array.from(uniqueTypes.values()));
			break;
		case 'calc':
			calcWR(parseInt(param) || 1000, 'movie');
		default:
			console.error(`Unknown command ${command}`);
			process.exit(1);
	}
} else {
	calcWR(1000, 'movie');
}
