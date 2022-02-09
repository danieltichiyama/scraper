# Scraper

- input.csv: takes in a CSV with comma separated fields in the format: PackageName, CurrentVersion, UpdatedVersion
  - no headers in CSV
  - for some reason the scrape doesn't work on the first row of the CSV, but if you include the same package twice it will catch it the second time:
    ```
    EPiServer.CMS,11.20.0,11.20.11 (can't find version checkboxes)
    EPiServer.CMS,11.20.0,11.20.11 (finds version checkboxes)
    ...
    ```
- creates output.csv with in the format: id,url,type,description,package
