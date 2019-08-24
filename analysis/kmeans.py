import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from collections import Counter

nClusters = 10
dataPointLimits = 0

# read data from file
# features:
# 0: ['Cassette', 'CD', 'CD'....]
# 1: [1984, 1984, 2000         ....]
# ...
with open("../crawler/dataset.txt") as f:
    count, featureCount = [int(x) for x in next(f).split()]  # read first line
    if dataPointLimits != 0 and count > dataPointLimits:
        count = dataPointLimits
    features = [[] for y in range(featureCount)]
    readCount = 0
    for line in f:  # read rest of lines
        if readCount > count:
            break
        readCount = readCount + 1
        datapoint = line.split(',')
        for i in range(len(features)):
            if i == 1:
                features[i].append(int(datapoint[i]))
            else:
                features[i].append(datapoint[i])

# factorize features
# factorizedFeatures:
# 0: [0, 1, 0....]
# 1: [0, 0, 1....]
# ...
factorizedFeatures = [[] for y in range(featureCount)]
for i in range(len(features)):
    if i != 1:
        factorizedFeatures[i] = pd.factorize(features[i])[0]
    else:
        factorizedFeatures[i] = np.array(features[i])

# factorizedFeaturesTuples:
# 0: [0,0]
# 1: [1,0]
# 2: [0,1]
# ...
factorizedFeaturesTuples = np.zeros([count, featureCount], np.int16)
for i in range(0, count):
    factorizedFeaturesTuples[i] = [
        feature[i] for feature in factorizedFeatures
    ]

intFeatureTuples = np.empty(count, np.int16)
for i in range(0, count):
    intFeatureTuples[i] = features[1][i]

# count the occurrences of each point
c = Counter(zip(factorizedFeatures[0], factorizedFeatures[1]))
# create a list of the sizes, here multiplied by 10 for scale
density = [
    0.5 * c[(xx, yy)]
    for xx, yy in zip(factorizedFeatures[0], factorizedFeatures[1])
]

# plot
plt.scatter(factorizedFeatures[0],
            features[1],
            c='white',
            marker='o',
            edgecolor='black',
            s=density)
plt.xlabel("Format")
plt.ylabel("Year")
#plt.show()

km = KMeans(n_clusters=nClusters,
            init='random',
            n_init=10,
            max_iter=300,
            tol=1e-04,
            random_state=0)
y_km = km.fit_predict(factorizedFeaturesTuples)

jet = plt.get_cmap('jet')
markers = [
    'o', 'v', '^', '<', '>', '8', 's', 'p', 'h', 'H', 'D', 'd', 'P', 'X'
]
colors = iter(jet(np.linspace(0, 1, 10)))

#Plotting
if nClusters > len(markers):
    print('Cant plot so many clusters')
else:
    for i in range(0, nClusters):
        color = next(colors)
        marker = markers[i]
        plt.scatter(factorizedFeaturesTuples[y_km == i, 0],
                    intFeatureTuples[y_km == i],
                    c=color,
                    marker=marker,
                    edgecolor='black',
                    label='cluster ' + str(i),
                    s=density)

# plot the centroids
plt.scatter(km.cluster_centers_[:, 0],
            km.cluster_centers_[:, 1],
            s=250,
            marker='*',
            c='red',
            edgecolor='black',
            label='centroids')
plt.legend(scatterpoints=1)
plt.grid()
plt.show()