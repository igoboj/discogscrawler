import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import sys, getopt
import random
import colorsys
import seaborn as sns
import math
from mpl_toolkits.mplot3d import Axes3D
from collections import Counter
from sklearn.preprocessing import LabelEncoder
from sklearn.preprocessing import Normalizer
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans


def takespread(sequence, num):
    length = float(len(sequence))
    retVal = sequence
    if length <= num:
        return retVal
    else:
        retVal = [int(math.ceil(i * length / num)) for i in range(num)]
        if retVal[-1] != sequence[-1]:
            retVal.append(sequence[-1])
    return retVal


def main(argv):
    dataSetFile = ""
    nClusters = 3
    dataPointLimits = 0

    try:
        helpmsg = 'The script can visualise up to 10 clusters in 2D or 3D\n' + 'Usage: kmeans.py -i <dataSetFile> -k <nClusters> -l <dataPointLimit>'
        opts, args = getopt.getopt(argv[1:], "hi:k:l:", [
            'input=',
            'kClusters=',
            'limit=',
        ])
    except getopt.GetoptError as err:
        print(str(err))
        print(helpmsg)
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
            print(helpmsg)
            sys.exit()
        elif opt in ("-i", "--input"):
            dataSetFile = arg
        elif opt in ("-k", "--kClusters"):
            nClusters = int(arg)
        elif opt in ("-l", "--limit"):
            dataPointLimits = int(arg)
    if len(dataSetFile) < 1:
        print("No input dataset specified.")
        print(helpmsg)
        sys.exit()

    print('Dataset: "', dataSetFile)
    print('Number of clusters: ', str(nClusters))
    print('Process files limit: ', str(dataPointLimits))

    # read data from file
    # features:
    # 0: ['Cassette', 'CD', 'CD'....]
    # 1: [1984, 1984, 2000         ....]
    # ...
    with open(dataSetFile) as f:
        rowCount, featureCount = [int(x)
                                  for x in next(f).split()]  # read first line
        featureListInfo = f.readline().split(',')[:-1]
        featureList = [[
            i, featureListInfo[i].strip().split(' ')[0],
            featureListInfo[i].strip().split(' ')[1] == "number"
        ] for i in range(len(featureListInfo))]

        if dataPointLimits != 0 and rowCount > dataPointLimits:
            rowCount = dataPointLimits
        features = [[] for y in range(featureCount)]
        readCount = 0
        for line in f:  # read rest of lines
            if readCount >= rowCount:
                break
            readCount = readCount + 1
            datapoint = line.split(',')
            for i in range(len(features)):
                features[i].append(datapoint[i])

    unchosenFeatures = featureList
    chosenFeatures = []
    userInput = print(
        "Input feature number to choose or 'q' to finish choosing.")
    while len(unchosenFeatures) > 0:
        print('Available features: ', [
            str(i) + ":" + unchosenFeatures[i][1]
            for i in range(0, len(unchosenFeatures))
        ])
        userInput = input("Choice:")
        try:
            choice = int(userInput)
            if choice < len(unchosenFeatures):
                chosenFeatures.append(unchosenFeatures[choice])
                unchosenFeatures.pop(choice)
            else:
                print('Index out of range')
        except ValueError:
            print('Features chosen: ', [
                str(i) + ":" + chosenFeatures[i][1]
                for i in range(0, len(chosenFeatures))
            ])
            break
    if len(chosenFeatures) == 0:
        print('No features chosen. Exiting.')
        sys.exit(1)

    # encode labels
    encoders = [None] * featureCount
    encodedLabels = [None] * featureCount
    # encodedLabels:
    # 0: [3, [0, 1, 0....]]
    # 1: [4, [0, 0, 1....]]
    # ...
    for i in range(0, len(chosenFeatures)):
        featureIndex = chosenFeatures[i][0]
        encoders[featureIndex] = LabelEncoder()
        encoders[featureIndex].fit(features[featureIndex])
        encodedLabels[featureIndex] = encoders[featureIndex].fit_transform(
            features[featureIndex])

    # normalize data
    arr = np.empty([len(chosenFeatures), rowCount])

    for i in range(len(chosenFeatures)):
        arr[i] = encodedLabels[chosenFeatures[i][0]]

    #arr = arr.reshape(-1, 1)
    plottable_X = arr
    arr = np.transpose(arr)

    #  scaler = StandardScaler().fit(arr)
    #  standardized_X = scaler.fit_transform(arr)

    #  normalizer = Normalizer().fit(standardized_X)
    #  normalized_X = normalizer.fit_transform(arr)

    #plottable_X = np.transpose(normalized_X)

    km = KMeans(n_clusters=nClusters,
                init='random',
                n_init=10,
                max_iter=300,
                tol=1e-04,
                random_state=0)
    y_km = km.fit_predict(arr)

    markers = [
        'o', 'v', '^', '<', '>', '8', 's', 'p', 'h', 'H', 'D', 'd', 'P', 'X'
    ]

    colors = sns.hls_palette(10, l=.5, s=1.0)
    random.seed(124)
    random.shuffle(colors)

    # plot
    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    ax.set_title(label='Clusters:' + str(nClusters) + ' DataPoints:' +
                 str(rowCount),
                 pad=20.)

    if len(chosenFeatures) == 3:
        ax.set_xlabel(chosenFeatures[0][1], labelpad=20.)
        ax.set_ylabel(chosenFeatures[1][1], labelpad=20.)
        ax.set_zlabel(chosenFeatures[2][1], labelpad=20.)

        ax.tick_params(direction='out', grid_color='r', grid_alpha=0.5)

        ax.xaxis.set_tick_params(rotation=90)
        ax.yaxis.set_tick_params(rotation=90)

        xTickValues = list(set(encodedLabels[chosenFeatures[0][0]]))
        yTickValues = list(set(encodedLabels[chosenFeatures[1][0]]))
        zTickValues = list(set(encodedLabels[chosenFeatures[2][0]]))
        # X TICKS
        ax.set_xticks(takespread(xTickValues, 25))
        ax.set_xticklabels(
            encoders[chosenFeatures[0][0]].inverse_transform(
                takespread(xTickValues, 25)))

        # Y TICKS
        ax.set_yticks(takespread(yTickValues, 25))
        ax.set_yticklabels(
            encoders[chosenFeatures[1][0]].inverse_transform(
                takespread(yTickValues, 25)))

        # Z TICKS
        ax.set_zticks(takespread(zTickValues, 25))
        ax.set_zticklabels(
            encoders[chosenFeatures[2][0]].inverse_transform(
                takespread(zTickValues, 25)))

        # count the occurrences of each point
        c = Counter(zip(plottable_X[0], plottable_X[1], plottable_X[2]))
        # create a list of the sizes, here multiplied by 10 for scale
        density = [
            10 + ((2000) / rowCount) * c[(xx, yy, zz)] for xx, yy, zz in
            zip(plottable_X[0], plottable_X[1], plottable_X[2])
        ]

        for i in range(0, nClusters):
            color = colors[i % 10]
            marker = markers[i % len(markers)]
            ax.scatter(xs=plottable_X[0, y_km == i],
                        ys=plottable_X[1, y_km == i],
                        zs=plottable_X[2, y_km == i],
                        c=color,
                        marker=marker,
                        edgecolor='black',
                        label='cluster ' + str(i),
                        s=density)

    elif len(chosenFeatures) == 2:
        ax.set_xlabel(chosenFeatures[0][1], labelpad=20.)
        ax.set_ylabel(chosenFeatures[1][1], labelpad=20.)

        ax.tick_params(direction='out', grid_color='r', grid_alpha=0.5)

        ax.xaxis.set_tick_params(rotation=90)
        ax.yaxis.set_tick_params(rotation=90)

        xTickValues = list(set(encodedLabels[chosenFeatures[0][0]]))
        yTickValues = list(set(encodedLabels[chosenFeatures[1][0]]))
        # X TICKS
        ax.set_xticks(takespread(xTickValues, 25))
        ax.set_xticklabels(
            encoders[chosenFeatures[0][0]].inverse_transform(
                takespread(xTickValues, 25)))

        # Y TICKS
        ax.set_yticks(takespread(yTickValues, 25))
        ax.set_yticklabels(
            encoders[chosenFeatures[1][0]].inverse_transform(
                takespread(yTickValues, 25)))

        # count the occurrences of each point
        c = Counter(zip(plottable_X[0], plottable_X[1]))
        # create a list of the sizes, here multiplied by 10 for scale
        density = [
            10 + ((2000) / rowCount) * c[(xx, yy)]
            for xx, yy in zip(plottable_X[0], plottable_X[1])
        ]

        for i in range(0, nClusters):
            color = colors[i % 10]
            marker = markers[i % len(markers)]
            ax.scatter(xs=plottable_X[0, y_km == i],
                        ys=plottable_X[1, y_km == i],
                        c=color,
                        marker=marker,
                        edgecolor='black',
                        label='cluster ' + str(i),
                        s=50)

    # plot the centroids
    if len(chosenFeatures) == 3:
        ax.scatter(xs=km.cluster_centers_[:, 0],
                   ys=km.cluster_centers_[:, 1],
                   zs=km.cluster_centers_[:, 2],
                   s=350,
                   marker='*',
                   c='red',
                   edgecolor='black',
                   label='centroids')
    elif len(chosenFeatures) == 2:
        ax.scatter(xs=km.cluster_centers_[:, 0],
                   ys=km.cluster_centers_[:, 1],
                   s=350,
                   marker='*',
                   c='red',
                   edgecolor='black',
                   label='centroids')
    plt.legend()
    plt.grid()
    plt.show()


if __name__ == '__main__':
    main(sys.argv)