// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides the ObjectCollection class.
 */
tvcm.require('tvcm.utils');
tvcm.require('tvcm.range');
tvcm.require('tvcm.sorted_array_utils');
tvcm.require('tracing.trace_model.object_instance');
tvcm.require('tracing.trace_model.time_to_object_instance_map');

tvcm.exportTo('tracing.trace_model', function() {
  var ObjectInstance = tracing.trace_model.ObjectInstance;

  /**
   * A collection of object instances and their snapshots, accessible by id and
   * time, or by object name.
   *
   * @constructor
   */
  function ObjectCollection(parent) {
    this.parent = parent;
    this.bounds = new tvcm.Range();
    this.instanceMapsById_ = {}; // id -> TimeToObjectInstanceMap
    this.instancesByTypeName_ = {};
    this.createObjectInstance_ = this.createObjectInstance_.bind(this);
  }

  ObjectCollection.prototype = {
    __proto__: Object.prototype,

    createObjectInstance_: function(parent, id, category, name, creationTs) {
      var constructor = tracing.trace_model.ObjectInstance.getConstructor(name);
      var instance = new constructor(parent, id, category, name, creationTs);
      var typeName = instance.typeName;
      var instancesOfTypeName = this.instancesByTypeName_[typeName];
      if (!instancesOfTypeName) {
        instancesOfTypeName = [];
        this.instancesByTypeName_[typeName] = instancesOfTypeName;
      }
      instancesOfTypeName.push(instance);
      return instance;
    },

    getOrCreateInstanceMap_: function(id) {
      var instanceMap = this.instanceMapsById_[id];
      if (instanceMap)
        return instanceMap;
      instanceMap = new tracing.trace_model.TimeToObjectInstanceMap(
          this.createObjectInstance_, this.parent, id);
      this.instanceMapsById_[id] = instanceMap;
      return instanceMap;
    },

    idWasCreated: function(id, category, name, ts) {
      var instanceMap = this.getOrCreateInstanceMap_(id);
      return instanceMap.idWasCreated(category, name, ts);
    },

    addSnapshot: function(id, category, name, ts, args) {
      var instanceMap = this.getOrCreateInstanceMap_(id, category, name, ts);
      var snapshot = instanceMap.addSnapshot(category, name, ts, args);
      if (snapshot.objectInstance.category != category) {
        throw new Error('Added snapshot with cat=' + category + ' impossible.' +
                        'It instance was created/snapshotted with cat=' +
                        snapshot.objectInstance.category);
      }
      if (snapshot.objectInstance.name != name) {
        throw new Error('Added snapshot with different name than ' +
                        'when it was created');
      }
      return snapshot;
    },

    idWasDeleted: function(id, category, name, ts) {
      var instanceMap = this.getOrCreateInstanceMap_(id, category, name, ts);
      var deletedInstance = instanceMap.idWasDeleted(category, name, ts);
      if (!deletedInstance)
        return;
      if (deletedInstance.category != category) {
        throw new Error('Deleting object ' + deletedInstance.name +
                        ' with a different category ' +
                        'than when it was created. It previous had cat=' +
                        deletedInstance.category + ' but the delete command ' +
                        'had cat=' + category);
      }
      if (deletedInstance.name != name) {
        throw new Error('Deleting an object with a different name than ' +
                        'when it was created');
      }
    },

    autoDeleteObjects: function(maxTimestamp) {
      tvcm.iterItems(this.instanceMapsById_, function(id, i2imap) {
        var lastInstance = i2imap.lastInstance;
        if (lastInstance.deletionTs != Number.MAX_VALUE)
          return;
        i2imap.idWasDeleted(
            lastInstance.category, lastInstance.name, maxTimestamp);
        // idWasDeleted will cause lastInstance.deletionTsWasExplicit to be set
        // to true. Unset it here.
        lastInstance.deletionTsWasExplicit = false;
      });
    },

    getObjectInstanceAt: function(id, ts) {
      var instanceMap = this.instanceMapsById_[id];
      if (!instanceMap)
        return undefined;
      return instanceMap.getInstanceAt(ts);
    },

    getSnapshotAt: function(id, ts) {
      var instance = this.getObjectInstanceAt(id, ts);
      if (!instance)
        return undefined;
      return instance.getSnapshotAt(ts);
    },

    iterObjectInstances: function(iter, opt_this) {
      opt_this = opt_this || this;
      tvcm.iterItems(this.instanceMapsById_, function(id, i2imap) {
        i2imap.instances.forEach(iter, opt_this);
      });
    },

    getAllObjectInstances: function() {
      var instances = [];
      this.iterObjectInstances(function(i) { instances.push(i); });
      return instances;
    },

    getAllInstancesNamed: function(name) {
      return this.instancesByTypeName_[name];
    },

    getAllInstancesByTypeName: function() {
      return this.instancesByTypeName_;
    },

    preInitializeAllObjects: function() {
      this.iterObjectInstances(function(instance) {
        instance.preInitialize();
      });
    },

    initializeAllObjects: function() {
      this.iterObjectInstances(function(instance) {
        instance.initialize();
      });
    },

    initializeInstances: function() {
      this.iterObjectInstances(function(instance) {
        instance.initialize();
      });
    },

    updateBounds: function() {
      this.bounds.reset();
      this.iterObjectInstances(function(instance) {
        instance.updateBounds();
        this.bounds.addRange(instance.bounds);
      }, this);
    },

    shiftTimestampsForward: function(amount) {
      this.iterObjectInstances(function(instance) {
        instance.shiftTimestampsForward(amount);
      });
    },

    addCategoriesToDict: function(categoriesDict) {
      this.iterObjectInstances(function(instance) {
        categoriesDict[instance.category] = true;
      });
    },

    toJSON: function() {
      // TODO(nduca): Implement this if we need it.
      return {};
    },

    iterateAllEvents: function(callback) {
      this.iterObjectInstances(function(instance) {
        callback(instance);
        instance.snapshots.forEach(callback);
      });
    }
  };

  return {
    ObjectCollection: ObjectCollection
  };
});
