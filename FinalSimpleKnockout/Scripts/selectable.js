/*
Provide an observableArray with some smarts related to selection 
of an item, or items within it.
If 'multiple' is passed in, then it is a multiply selectable
array, and has two new attributes: ``selectedItems`` and ``selectedIndexes``.
If 'multiple' is not passed in, then it new attributes of
``selectedItem`` and ``selectedIndex`` are created.
These attributes are all read-write: changing the selected item(s) also
changes the selected index(es).
You may also pass in 'bindingTools', which creates methods called:
* .new()
* .clone(object)
* .delete(object)
Which create a new object, clone an object (or the current selected object(s)),
and delete an object (or the current selected object(s)). These are intended to
be used in click: binding handlers, where one of the objects would be the
current context.
*/

(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['knockout'], function (ko) {
			return factory(ko);
		});
	} else {
		// Browser globals
		factory(root.ko);
	}
}(this, function (ko) {

	ko.observableArray.fn.selectable = function () {

		// Turn arguments into an options object. Easier to look at options.foo
		var options = {};
		ko.utils.arrayForEach(ko.utils.makeArray(arguments), function (opt) {
			options[opt] = true;
		});

		if (options.multiple) {

			// Multiple selection array.

			var selectedItems = ko.observableArray([]);

			this.selectedItems = ko.computed({
				read: selectedItems,
				write: function (items) {
					selectedItems([]);
					ko.utils.arrayForEach(items, function (obj) {
						// Ensure items only appear in the selectedItems array once.
						// Ensure only items in the observableArray appear in selectedItems.
						if (selectedItems().indexOf(obj) == -1 && this.indexOf(obj) >= 0) {
							selectedItems().push(obj);
						}
					}.bind(this));
					selectedItems.notifySubscribers();
				}
			}, this);

			this.selectedIndexes = ko.computed({
				read: function () {
					return ko.utils.arrayMap(this.selectedItems(), function (obj) {
						return this.indexOf(obj);
					}.bind(this));
				},
				write: function (indexes) {
					this.selectedItems(ko.utils.arrayMap(indexes, function (i) {
						return this()[i];
					}.bind(this)));
				}
			}, this);

			this.selected = this.selectedItems;

		} else {

			// Single object selection only.
			var selected = ko.observable(null);

			this.selectedItem = ko.computed({
				read: selected,
				write: function (object) {
					if (this.indexOf(object) < 0) {
						selected(null);
					} else {
						selected(object);
					}
				}
			}, this);

			this.selectedIndex = ko.computed({
				read: function () {
					return this.indexOf(selected());
				},
				write: function (index) {
					this.selectedItem(this()[index])
				}
			}, this);

			this.selected = this.selectedItem;
		}

		// These methods are primarily designed for using in binding click
		// handlers: allowing you to use a simpler binding content.
		// Thus, you should be able to do stuff like:
		// <a data-bind="click: $root.collection.new">Create New</a>
		// .clone() and .delete() will work on the current item in the binding
		// context, or the selected item(s) if called with no arguments.
		// .new() always creates a brand new item, regardless of context.
		if (options.bindingTools) {
			// Clone the passed in item. 
			var clone = function clone(object) {
				if (object.__ko_mapping__) {
					if (window.require && !ko.mapping) {
						ko.mapping = require('knockout/mapping');
					}
					data = ko.mapping.toJS(object);
				} else {
					data = ko.toJS(object);
				}
				if (data.name) {
					data.name += ' copy';
				}
				if (this.create) {
					created = this.create(data);
				} else {
					if (object.__ko_mapping__) {
						created = ko.mapping.fromJS(data, object.__ko_mapping__);
					} else {
						created = data;
					}
					this.push(created);
				}
				return created;
			}.bind(this);

			// Clone the passed in object, or selected object(s).
			// Select the newly created clone(s).
			this.clone = function (object) {
				var data, created;

				if (this.selectedItem) {
					this.selectedItem(clone(object || this.selectedItem()));
				} else {
					if (object) {
						this.selectedItems([clone(object)]);
					} else {
						this.selectedItems(ko.utils.arrayMap(this.selectedItems(), clone));
					}
				}
				return this;
			}.bind(this);

			// Delete the passed in or selected item(s).
			// If we deleted the selection, deselect it.
			this.delete = function (object) {

				if (this.selectedItem) {
					this.remove(object || this.selectedItem());
					if (this.selectedItem() === object) {
						this.selectedItem(null);
					}
				} else {
					if (object) {
						this.remove(object);
						this.selectedItems.remove(object);
					} else {
						this.removeAll(this.selectedItems());
						this.selectedItems([])
					}
				}

				return this;
			}.bind(this);

			// Create a new object, with raw defaults, using the create method
			// if one exists, otherwise an empty object. Select the newly created 
			// object. Deliberately ignores any passed in arguments, so we can
			// use it safely in a binding.
			this.new = function () {
				var created;

				if (this.create) {
					// Assumes this.create() also pushes to this.
					created = this.create({});
				} else {
					created = {};
					this.push(created)
				}

				if (this.selectedItem) {
					this.selectedItem(created);
				} else {
					this.selectedItems([created]);
				}

				return this;
			}.bind(this);

		}

		return this;
	}
}));