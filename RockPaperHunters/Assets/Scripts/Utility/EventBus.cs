using System;
using System.Collections.Generic;

/// <summary>
/// Simple publish-subscribe event bus for decoupling game logic from UI.
/// Game systems fire events, UI subscribes to update visuals.
/// </summary>
public static class EventBus
{
    private static readonly Dictionary<Type, List<Delegate>> _listeners = new Dictionary<Type, List<Delegate>>();

    /// <summary>
    /// Subscribe to an event type.
    /// </summary>
    public static void Subscribe<T>(Action<T> callback) where T : struct
    {
        var type = typeof(T);
        if (!_listeners.ContainsKey(type))
            _listeners[type] = new List<Delegate>();
        _listeners[type].Add(callback);
    }

    /// <summary>
    /// Unsubscribe from an event type.
    /// </summary>
    public static void Unsubscribe<T>(Action<T> callback) where T : struct
    {
        var type = typeof(T);
        if (_listeners.ContainsKey(type))
            _listeners[type].Remove(callback);
    }

    /// <summary>
    /// Publish an event to all subscribers.
    /// </summary>
    public static void Publish<T>(T eventData) where T : struct
    {
        var type = typeof(T);
        if (!_listeners.ContainsKey(type)) return;

        // Iterate a copy to allow subscribe/unsubscribe during callbacks
        var listenersCopy = new List<Delegate>(_listeners[type]);
        foreach (var listener in listenersCopy)
        {
            ((Action<T>)listener)?.Invoke(eventData);
        }
    }

    /// <summary>
    /// Remove all listeners. Call on scene unload or game reset.
    /// </summary>
    public static void Clear()
    {
        _listeners.Clear();
    }
}
