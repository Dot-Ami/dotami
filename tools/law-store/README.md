# The law store's builder tools

Python that turns Canadian statutes into one SQLite file and checks citations against it. It is for
maintainers and CI: it never runs on a person's computer, and nothing here goes into the installer.

| Path                                                                                          | What it is                                                                                                  |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `contract/corpus_contract.py`                                                                 | The only writer. Refuses undated documents, unregistered sources, quotes outside their section, and deletes |
| `contract/selftest.py`                                                                        | Proves each refusal fires. Offline, on a temporary store                                                    |
| `contract/cite_check.py`                                                                      | Checks that cited sections exist, with deliberately fake controls that must not be found                    |
| `contract/ingest_xml.py`, `fetch_document.py`, `parse_provisions.py`, `extract_references.py` | Fetch a source, split it into provisions, find its cross-references                                         |
| `contract/lookup.py`                                                                          | One provision's words as JSON, for "Show the words"                                                         |
| `contract/new_store.py`                                                                       | Makes an empty `law.db` from `migrations/`                                                                  |
| `registry.yaml`                                                                               | Every source with its legal basis. No entry, no ingestion                                                   |

## Running the checks

```bash
pip install --require-hashes -r tools/law-store/requirements.txt
python tools/law-store/contract/selftest.py
python tools/law-store/contract/new_store.py
python tools/law-store/contract/ingest_xml.py ita cbca
python tools/law-store/contract/cite_check.py
```

`ingest_xml.py` fetches the two Acts from Justice Canada into `law.db`. The `Law store` workflow runs
these same steps on a throw-away store.

## What never goes in this repository

No built store (`*.db` is ignored by git) and no Act text beyond short test quotes. Whether law text may
ship in a public release is a question for a lawyer, and the answer is not in yet.
