import requests
import json

def load_expt(expt_id, expt_name):
    base_url = 'https://inspirehep.net/api/experiments/'
    url = base_url + str(expt_id)
    response = requests.get(url)
    if response.status_code != 200:
        print(f'ERROR! Got HTTP error {response.status_code()} when loading experiment "{expt_name}". Skipping...')
        return ""
    print(json.dumps(response.json(), indent=4))
    return response.json()


experiment_data = []
# with open('experiments_inspirehep_test_2.json', 'r') as f_in:
    # experiment_data = json.load(f_in)


all_input = []
for page in range(1,5):
    print(f'Loading page {page}...')
    response = requests.get(f'https://inspirehep.net/api/experiments?sort=mostrecent&size=1000&page={page}')
    if response.status_code != 200:
        print(f'ERROR! Got HTTP error {response.status_code} when loading experiments. Skipping...')
        continue
    input = response.json()
    all_input.append(input)

all_data = []
for input in all_input:
    for expt in input['hits']['hits']:
        expt_id = expt['id']
        metadata = expt['metadata']
        data = metadata.copy()
        data['id'] = expt_id
        all_data.append(data)

with open('experiments.json', 'w') as f_out:
        json.dump(all_data, f_out, indent=4)

# for expt_name, my_data in my_experiment_data.items():
#     expt_id = my_data["id"]
#     new_data = load_expt(expt_id, expt_name)
#     if new_data == "":
#         continue

#     found = False
#     for expt in experiment_data:
#         if expt['custom_data']['inspire_id'] == expt_id:
#             found = True
#             break
#     if found == False:
#         expt_data = {}
#         expt_data['custom_data'] = {}
#         expt_data['inspire_data'] = {}
#     else:
#         expt_data = expt

#     for field in metadata_fields:
#         if field in new_data['metadata'].keys():
#             expt_data['inspire_data'][field] = new_data['metadata'][field]
#             if field == 'inspire_classification':
#                 raw_string = new_data['metadata'][field][0]
#                 substrings = raw_string.split('|')
#                 expt_data['custom_data']['classification'] = substrings
#         else:
#             if field == 'name_variants':
#                 expt_data['inspire_data']['name_variants'] = [new_data['metadata']['legacy_name']]
#     expt_data['custom_data']['status'] = determine_expt_status(new_data['metadata'])
#     expt_data['custom_data']['inspire_id'] = expt_id
#     expt_data['custom_data']['latitude'] = my_data['latitude']
#     expt_data['custom_data']['longitude'] = my_data['longitude']
#     expt_data['custom_data']['image_path'] = my_data['image_path']
#     if found == False:
#         experiment_data.append(expt_data)

#     with open('experiments_inspirehep_test_2.json', 'w') as f_out:
#         json.dump(experiment_data, f_out, indent=4)
