using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Individual location card for selection phase. Displays location name and icon.
/// Handles click, selected highlight, and disabled state.
/// </summary>
public class LocationCardUI : MonoBehaviour
{
    [Header("UI Elements")]
    [SerializeField] private Image backgroundImage;
    [SerializeField] private Image locationIcon;
    [SerializeField] private TextMeshProUGUI locationNameText;
    [SerializeField] private TextMeshProUGUI tokenTypeLabel; // "Hunter" or "Apprentice"
    [SerializeField] private Button cardButton;
    [SerializeField] private Image selectionBorder;

    [Header("Colors")]
    [SerializeField] private Color normalColor = new Color(0.93f, 0.94f, 0.95f);
    [SerializeField] private Color selectedColor = new Color(0.2f, 0.6f, 0.86f);
    [SerializeField] private Color disabledColor = new Color(0.5f, 0.55f, 0.56f);

    private LocationData locationData;
    private bool isHunterCard;
    private bool isSelected;
    private bool isDisabled;
    private System.Action<LocationId> onClickCallback;

    public LocationId LocationId => locationData.locationId;

    public void Setup(LocationData data, bool isHunter, System.Action<LocationId> onClick)
    {
        locationData = data;
        isHunterCard = isHunter;
        onClickCallback = onClick;

        locationNameText.text = data.locationName;
        tokenTypeLabel.text = isHunter ? "Hunter" : "Apprentice";

        if (data.iconSprite != null)
            locationIcon.sprite = data.iconSprite;

        cardButton.onClick.RemoveAllListeners();
        cardButton.onClick.AddListener(OnClicked);

        SetSelected(false);
        SetDisabled(false);
    }

    private void OnClicked()
    {
        if (isDisabled) return;
        onClickCallback?.Invoke(locationData.locationId);
    }

    public void SetSelected(bool selected)
    {
        isSelected = selected;
        UpdateVisuals();
    }

    public void SetDisabled(bool disabled)
    {
        isDisabled = disabled;
        cardButton.interactable = !disabled;
        UpdateVisuals();
    }

    private void UpdateVisuals()
    {
        if (isDisabled)
        {
            backgroundImage.color = disabledColor;
            if (selectionBorder != null) selectionBorder.enabled = false;
            var cg = GetComponent<CanvasGroup>();
            if (cg != null) cg.alpha = 0.5f;
        }
        else if (isSelected)
        {
            backgroundImage.color = selectedColor;
            if (selectionBorder != null) selectionBorder.enabled = true;
            locationNameText.color = Color.white;
            var cg = GetComponent<CanvasGroup>();
            if (cg != null) cg.alpha = 1f;
        }
        else
        {
            backgroundImage.color = normalColor;
            if (selectionBorder != null) selectionBorder.enabled = false;
            locationNameText.color = new Color(0.17f, 0.24f, 0.31f);
            var cg = GetComponent<CanvasGroup>();
            if (cg != null) cg.alpha = 1f;
        }
    }
}
