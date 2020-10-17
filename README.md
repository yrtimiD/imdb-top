# IMDb Weighted rating calculator

## IMDb Weighted rating calculation
How do you calculate the rank of movies and TV shows on the Top Rated Movies and Top Rated TV Show lists?
The following formula is used to calculate the Top Rated 250 titles. This formula provides a true 'Bayesian estimate', which takes into account the number of votes each title has received, minimum votes required to be on the list, and the mean vote for all titles:

weighted rating `(WR) = (v ÷ (v+m)) × R + (m ÷ (v+m)) × C`

Where:
R = average for the movie (mean) = (rating)  
v = number of votes for the movie = (votes)  
m = minimum votes required to be listed in the Top Rated list (currently 25,000)  
C = the mean vote across the whole report  


## IMDb Datasets
https://www.imdb.com/interfaces/
https://datasets.imdbws.com/

download and unzip:
* `title.ratings.tsv.gz` to `ratings.tsv`
* `title.basics.tsv.gz` to `titles.tsv`

## Run

```sh
npm run create
```
Creates required json files (required only once on each dataset update). Expect high memory usage.


```sh
npm start
```
To actually calculate top N. Result will be saved to the `top_N.tsv` file.
